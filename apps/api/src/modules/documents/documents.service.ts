import { randomUUID } from 'crypto';
import { DocumentsRepository } from './documents.repository';
import { StorageService } from '../../services/storage.service';
import { QueueService } from '../../services/queue.service';
import { DocumentType, DocumentStatus } from '@exam-ai/database';
import { CoursesService } from '../courses/courses.service';

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
  }) {
    // 1. Enforce course ownership check
    await this.coursesService.getCourseDetails(input.courseId, input.userId);

    // 2. Validate MIME type
    if (input.mimeType !== 'application/pdf') {
      const error: any = new Error('Only PDF documents are supported');
      error.statusCode = 400;
      error.code = 'INVALID_MIME_TYPE';
      throw error;
    }

    // 3. Validate File Size (Max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (input.buffer.length > MAX_SIZE) {
      const error: any = new Error('File size exceeds maximum limit of 50MB');
      error.statusCode = 400;
      error.code = 'FILE_TOO_LARGE';
      throw error;
    }

    // 4. Generate secure storage key
    const fileId = randomUUID();
    const storageKey = `courses/${input.courseId}/documents/${fileId}.pdf`;
    const docName = input.filename.replace(/\.pdf$/i, '');

    // 5. Upload file to R2 / Storage Service
    await this.storageService.uploadFile(storageKey, input.buffer, input.mimeType);

    // 6. Create Document record in DB
    const doc = await this.repository.create({
      courseId: input.courseId,
      userId: input.userId,
      name: docName,
      originalFilename: input.filename,
      type: input.type || DocumentType.LECTURE,
      mimeType: input.mimeType,
      storageKey,
      status: DocumentStatus.QUEUED,
    });

    // 7. Enqueue background processing job
    await this.queueService.enqueueDocumentProcessing({
      documentId: doc.id,
      courseId: doc.courseId,
      userId: doc.userId,
      storageKey: doc.storageKey,
      type: doc.type,
    });

    return doc;
  }

  async getCourseDocuments(courseId: string, userId: string) {
    await this.coursesService.getCourseDetails(courseId, userId);
    return this.repository.findByCourseId(courseId, userId);
  }

  async getDocumentDetails(documentId: string, userId: string) {
    const doc = await this.repository.findByIdAndUserId(documentId, userId);
    if (!doc) {
      const error: any = new Error('Document not found or access denied');
      error.statusCode = 404;
      error.code = 'DOCUMENT_NOT_FOUND';
      throw error;
    }

    const downloadUrl = await this.storageService.getSignedDownloadUrl(doc.storageKey);

    return {
      ...doc,
      downloadUrl,
    };
  }

  async deleteDocument(documentId: string, userId: string) {
    const doc = await this.getDocumentDetails(documentId, userId);
    await this.storageService.deleteFile(doc.storageKey);
    return this.repository.delete(documentId, userId);
  }

  async reprocessDocument(documentId: string, userId: string) {
    const doc = await this.getDocumentDetails(documentId, userId);
    const updated = await this.repository.updateStatus(doc.id, DocumentStatus.QUEUED, undefined, undefined);

    await this.queueService.enqueueDocumentProcessing({
      documentId: doc.id,
      courseId: doc.courseId,
      userId: doc.userId,
      storageKey: doc.storageKey,
      type: doc.type,
    });

    return updated;
  }
}
