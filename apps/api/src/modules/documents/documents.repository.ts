import { db, Document, DocumentType, DocumentStatus } from '@exam-ai/database';

export class DocumentsRepository {
  async create(data: {
    courseId: string;
    userId: string;
    name: string;
    originalFilename: string;
    type: DocumentType;
    mimeType: string;
    storageKey: string;
    status: DocumentStatus;
  }): Promise<Document> {
    return db.document.create({
      data: {
        courseId: data.courseId,
        userId: data.userId,
        name: data.name,
        originalFilename: data.originalFilename,
        type: data.type,
        mimeType: data.mimeType,
        storageKey: data.storageKey,
        status: data.status,
      },
    });
  }

  async findByCourseId(courseId: string, userId: string): Promise<Document[]> {
    return db.document.findMany({
      where: {
        courseId,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            pages: true,
            chunks: true,
            questions: true,
          },
        },
      },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Document | null> {
    return db.document.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            pages: true,
            chunks: true,
            questions: true,
          },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    status: DocumentStatus,
    error?: string,
    pageCount?: number
  ): Promise<Document> {
    return db.document.update({
      where: { id },
      data: {
        status,
        processingError: error ?? null,
        pageCount: pageCount !== undefined ? pageCount : undefined,
      },
    });
  }

  async delete(id: string, userId: string): Promise<Document> {
    return db.document.delete({
      where: {
        id,
        userId,
      },
    });
  }
}
