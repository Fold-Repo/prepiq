import { SyllabusRepository } from './syllabus.repository';
import { CoursesService } from '../courses/courses.service';
import { DocumentsService } from '../documents/documents.service';
import { QueueService } from '../../services/queue.service';
import { DocumentStatus, DocumentType } from '@exam-ai/database';
import { UpsertSyllabusTopicInput } from '@exam-ai/validation';
import { db } from '@exam-ai/database';

export class SyllabusService {
  private repository: SyllabusRepository;
  private coursesService: CoursesService;
  private documentsService: DocumentsService;
  private queueService: QueueService;

  constructor() {
    this.repository = new SyllabusRepository();
    this.coursesService = new CoursesService();
    this.documentsService = new DocumentsService();
    this.queueService = new QueueService();
  }

  async list(courseId: string, userId: string) {
    await this.coursesService.getCourseDetails(courseId, userId);
    return this.repository.listByCourseId(courseId);
  }

  async create(courseId: string, userId: string, input: UpsertSyllabusTopicInput) {
    await this.coursesService.getCourseDetails(courseId, userId);
    return this.repository.create(courseId, input);
  }

  async update(topicId: string, userId: string, input: UpsertSyllabusTopicInput) {
    const topic = await this.repository.findById(topicId);
    if (!topic) {
      const error: any = new Error('Syllabus topic not found');
      error.statusCode = 404;
      error.code = 'SYLLABUS_TOPIC_NOT_FOUND';
      throw error;
    }
    await this.coursesService.getCourseDetails(topic.courseId, userId);
    return this.repository.update(topicId, input);
  }

  async delete(topicId: string, userId: string) {
    const topic = await this.repository.findById(topicId);
    if (!topic) {
      const error: any = new Error('Syllabus topic not found');
      error.statusCode = 404;
      error.code = 'SYLLABUS_TOPIC_NOT_FOUND';
      throw error;
    }
    await this.coursesService.getCourseDetails(topic.courseId, userId);
    return this.repository.delete(topicId);
  }

  async extractFromDocument(documentId: string, userId: string) {
    const doc = await this.documentsService.getDocumentDetails(documentId, userId);
    if (doc.type !== DocumentType.SYLLABUS) {
      await this.documentsService.updateDocument(documentId, userId, { type: 'SYLLABUS' });
    }

    await db.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.QUEUED },
    });

    await this.queueService.enqueueDocumentProcessing({
      documentId: doc.id,
      courseId: doc.courseId,
      userId: doc.userId,
      storageKey: doc.storageKey,
      type: DocumentType.SYLLABUS,
      forceIndex: true,
    });

    return { message: 'Syllabus extraction queued', documentId };
  }
}
