import { randomUUID } from 'crypto';
import { DocumentsRepository } from './documents.repository';
import { StorageService } from '../../services/storage.service';
import { QueueService } from '../../services/queue.service';
import { DocumentType, DocumentStatus } from '@exam-ai/database';
import { CoursesService } from '../courses/courses.service';
import { wordCount } from '@exam-ai/pdf';
import { reindexDocumentPage } from '../../services/document-processor.service';
import {
  UpdateDocumentInput,
  UpdatePageContentInput,
  UpsertSectionInput,
  ReprocessDocumentInput,
} from '@exam-ai/validation';

function notFound(message = 'Document not found or access denied'): never {
  const error: any = new Error(message);
  error.statusCode = 404;
  error.code = 'DOCUMENT_NOT_FOUND';
  throw error;
}

export class DocumentsService {
  private repository: DocumentsRepository;
  private storageService: StorageService;
  private queueService: QueueService;
  private coursesService: CoursesService;

  constructor() {
    this.repository = new DocumentsRepository();
    this.storageService = new StorageService();
    this.queueService = new QueueService();
    this.coursesService = new CoursesService();
  }

  async uploadDocument(input: {
    courseId: string;
    userId: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
    type?: DocumentType;
    contentStartPage?: number | null;
    contentEndPage?: number | null;
  }) {
    await this.coursesService.getCourseDetails(input.courseId, input.userId);

    if (input.mimeType !== 'application/pdf') {
      const error: any = new Error('Only PDF documents are supported');
      error.statusCode = 400;
      error.code = 'INVALID_MIME_TYPE';
      throw error;
    }

    const MAX_SIZE = 50 * 1024 * 1024;
    if (input.buffer.length > MAX_SIZE) {
      const error: any = new Error('File size exceeds maximum limit of 50MB');
      error.statusCode = 400;
      error.code = 'FILE_TOO_LARGE';
      throw error;
    }

    this.assertValidRange(input.contentStartPage, input.contentEndPage);

    const fileId = randomUUID();
    const storageKey = `courses/${input.courseId}/documents/${fileId}.pdf`;
    const docName = input.filename.replace(/\.pdf$/i, '');

    await this.storageService.uploadFile(storageKey, input.buffer, input.mimeType);

    const doc = await this.repository.create({
      courseId: input.courseId,
      userId: input.userId,
      name: docName,
      originalFilename: input.filename,
      type: input.type || DocumentType.LECTURE,
      mimeType: input.mimeType,
      storageKey,
      status: DocumentStatus.QUEUED,
      contentStartPage: input.contentStartPage ?? null,
      contentEndPage: input.contentEndPage ?? null,
    });

    await this.queueService.enqueueDocumentProcessing({
      documentId: doc.id,
      courseId: doc.courseId,
      userId: doc.userId,
      storageKey: doc.storageKey,
      type: doc.type,
      forceIndex: input.contentStartPage != null,
    });

    return doc;
  }

  async getCourseDocuments(courseId: string, userId: string) {
    await this.coursesService.getCourseDetails(courseId, userId);
    return this.repository.findByCourseId(courseId, userId);
  }

  async getDocumentDetails(documentId: string, userId: string) {
    const doc = await this.repository.findByIdAndUserId(documentId, userId);
    if (!doc) notFound();

    const downloadUrl = await this.storageService.getSignedDownloadUrl(doc.storageKey);

    return {
      ...doc,
      downloadUrl,
    };
  }

  async updateDocument(documentId: string, userId: string, input: UpdateDocumentInput) {
    const doc = await this.getDocumentDetails(documentId, userId);
    this.assertValidRange(
      input.contentStartPage === undefined ? doc.contentStartPage : input.contentStartPage,
      input.contentEndPage === undefined ? doc.contentEndPage : input.contentEndPage
    );

    return this.repository.update(doc.id, {
      name: input.name,
      type: input.type as DocumentType | undefined,
      contentStartPage: input.contentStartPage === undefined ? undefined : input.contentStartPage,
      contentEndPage: input.contentEndPage === undefined ? undefined : input.contentEndPage,
    });
  }

  async deleteDocument(documentId: string, userId: string) {
    const doc = await this.getDocumentDetails(documentId, userId);
    await this.storageService.deleteFile(doc.storageKey);
    return this.repository.delete(documentId, userId);
  }

  async reprocessDocument(documentId: string, userId: string, input: ReprocessDocumentInput = {}) {
    const doc = await this.getDocumentDetails(documentId, userId);

    if (input.contentStartPage !== undefined || input.contentEndPage !== undefined) {
      this.assertValidRange(
        input.contentStartPage === undefined ? doc.contentStartPage : input.contentStartPage,
        input.contentEndPage === undefined ? doc.contentEndPage : input.contentEndPage
      );
      await this.repository.update(doc.id, {
        contentStartPage: input.contentStartPage === undefined ? undefined : input.contentStartPage,
        contentEndPage: input.contentEndPage === undefined ? undefined : input.contentEndPage,
      });
    }

    const updated = await this.repository.updateStatus(doc.id, DocumentStatus.QUEUED);

    await this.queueService.enqueueDocumentProcessing({
      documentId: doc.id,
      courseId: doc.courseId,
      userId: doc.userId,
      storageKey: doc.storageKey,
      type: doc.type,
      forceIndex: input.forceIndex ?? true,
    });

    return updated;
  }

  async listPages(
    documentId: string,
    userId: string,
    query: { page?: number; limit?: number; excluded?: boolean; search?: string; summary?: boolean }
  ) {
    await this.getDocumentDetails(documentId, userId);
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const { items, total } = await this.repository.listPages(documentId, {
      skip: (page - 1) * limit,
      take: limit,
      excluded: query.excluded,
      search: query.search,
      summary: query.summary,
    });

    return { items, total, page, limit, pageCount: Math.ceil(total / limit) };
  }

  async getPage(documentId: string, userId: string, pageNumber: number) {
    await this.getDocumentDetails(documentId, userId);
    const page = await this.repository.findPage(documentId, pageNumber);
    if (!page) {
      const error: any = new Error('Page not found');
      error.statusCode = 404;
      error.code = 'PAGE_NOT_FOUND';
      throw error;
    }
    return page;
  }

  async updatePage(
    documentId: string,
    userId: string,
    pageNumber: number,
    input: UpdatePageContentInput
  ) {
    await this.getDocumentDetails(documentId, userId);
    const words = wordCount(input.content);
    return this.repository.updatePage(documentId, pageNumber, {
      content: input.content,
      wordCount: words,
      isEmpty: words === 0,
    });
  }

  async reindexPage(documentId: string, userId: string, pageNumber: number) {
    await this.getDocumentDetails(documentId, userId);
    return reindexDocumentPage(documentId, pageNumber);
  }

  async listSections(documentId: string, userId: string) {
    await this.getDocumentDetails(documentId, userId);
    return this.repository.listSections(documentId);
  }

  async createSection(documentId: string, userId: string, input: UpsertSectionInput) {
    const doc = await this.getDocumentDetails(documentId, userId);
    return this.repository.createSection({
      documentId: doc.id,
      courseId: doc.courseId,
      title: input.title,
      pageStart: input.pageStart,
      pageEnd: input.pageEnd,
      order: input.order,
      parentId: input.parentId,
    });
  }

  async updateSection(sectionId: string, userId: string, input: UpsertSectionInput) {
    const section = await this.repository.findSectionById(sectionId);
    if (!section) {
      const error: any = new Error('Section not found');
      error.statusCode = 404;
      error.code = 'SECTION_NOT_FOUND';
      throw error;
    }
    await this.getDocumentDetails(section.documentId, userId);
    return this.repository.updateSection(sectionId, input);
  }

  async deleteSection(sectionId: string, userId: string) {
    const section = await this.repository.findSectionById(sectionId);
    if (!section) {
      const error: any = new Error('Section not found');
      error.statusCode = 404;
      error.code = 'SECTION_NOT_FOUND';
      throw error;
    }
    await this.getDocumentDetails(section.documentId, userId);
    return this.repository.deleteSection(sectionId);
  }

  async getFileBuffer(documentId: string, userId: string) {
    const doc = await this.getDocumentDetails(documentId, userId);
    const buffer = await this.storageService.downloadFile(doc.storageKey);
    return { buffer, filename: doc.originalFilename, mimeType: doc.mimeType };
  }

  private assertValidRange(start?: number | null, end?: number | null) {
    if (start != null && end != null && end < start) {
      const error: any = new Error('Content end page must be greater than or equal to start page');
      error.statusCode = 400;
      error.code = 'INVALID_CONTENT_RANGE';
      throw error;
    }
  }
}
