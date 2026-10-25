import { db, Document, DocumentType, DocumentStatus, Prisma } from '@exam-ai/database';

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
    contentStartPage?: number | null;
    contentEndPage?: number | null;
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
        contentStartPage: data.contentStartPage ?? null,
        contentEndPage: data.contentEndPage ?? null,
      },
    });
  }

  async findByCourseId(courseId: string, userId: string): Promise<Document[]> {
    return db.document.findMany({
      where: { courseId, userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            pages: true,
            chunks: true,
            questions: true,
            sections: true,
            syllabusTopics: true,
          },
        },
      },
    });
  }

  async findByIdAndUserId(id: string, userId: string) {
    return db.document.findFirst({
      where: { id, userId },
      include: {
        course: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            pages: true,
            chunks: true,
            questions: true,
            sections: true,
            syllabusTopics: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.DocumentUpdateInput
  ): Promise<Document> {
    return db.document.update({ where: { id }, data });
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
      where: { id, userId },
    });
  }

  async listPages(
    documentId: string,
    query: {
      skip: number;
      take: number;
      excluded?: boolean;
      search?: string;
      summary?: boolean;
    }
  ) {
    const where: Prisma.DocumentPageWhereInput = { documentId };
    if (query.excluded === false) where.isExcluded = false;
    if (query.excluded === true) where.isExcluded = true;
    if (query.search) {
      where.content = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      query.summary
        ? db.documentPage.findMany({
            where,
            orderBy: { pageNumber: 'asc' },
            skip: query.skip,
            take: query.take,
            select: {
              id: true,
              pageNumber: true,
              wordCount: true,
              isEmpty: true,
              isExcluded: true,
              editedAt: true,
              _count: { select: { chunks: true, questions: true } },
            },
          })
        : db.documentPage.findMany({
            where,
            orderBy: { pageNumber: 'asc' },
            skip: query.skip,
            take: query.take,
            include: {
              _count: { select: { chunks: true, questions: true } },
            },
          }),
      db.documentPage.count({ where }),
    ]);

    return { items, total };
  }

  async findPage(documentId: string, pageNumber: number) {
    return db.documentPage.findUnique({
      where: { documentId_pageNumber: { documentId, pageNumber } },
      include: {
        questions: {
          orderBy: { questionNumber: 'asc' },
        },
        _count: { select: { chunks: true, questions: true } },
      },
    });
  }

  async updatePage(
    documentId: string,
    pageNumber: number,
    data: { content: string; wordCount: number; isEmpty: boolean }
  ) {
    return db.documentPage.update({
      where: { documentId_pageNumber: { documentId, pageNumber } },
      data: {
        ...data,
        editedAt: new Date(),
      },
    });
  }

  async listSections(documentId: string) {
    return db.documentSection.findMany({
      where: { documentId },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { questions: true, chunks: true } },
      },
    });
  }

  async createSection(data: {
    documentId: string;
    courseId: string;
    title: string;
    pageStart: number;
    pageEnd: number;
    order?: number;
    parentId?: string | null;
  }) {
    return db.documentSection.create({
      data: {
        documentId: data.documentId,
        courseId: data.courseId,
        title: data.title,
        pageStart: data.pageStart,
        pageEnd: data.pageEnd,
        order: data.order ?? 0,
        parentId: data.parentId ?? null,
      },
    });
  }

  async updateSection(
    id: string,
    data: {
      title?: string;
      pageStart?: number;
      pageEnd?: number;
      order?: number;
      parentId?: string | null;
    }
  ) {
    return db.documentSection.update({ where: { id }, data });
  }

  async findSectionById(id: string) {
    return db.documentSection.findUnique({ where: { id } });
  }

  async deleteSection(id: string) {
    return db.documentSection.delete({ where: { id } });
  }
}
