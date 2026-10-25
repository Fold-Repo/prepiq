import { db } from '@exam-ai/database';
import { UpsertSyllabusTopicInput } from '@exam-ai/validation';

export class SyllabusRepository {
  async listByCourseId(courseId: string) {
    return db.syllabusTopic.findMany({
      where: { courseId, parentId: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        document: {
          select: { id: true, name: true, type: true },
        },
        children: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: {
            children: {
              orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
              include: {
                _count: { select: { questions: true } },
              },
            },
            _count: { select: { questions: true } },
          },
        },
        _count: { select: { questions: true } },
      },
    });
  }

  async create(courseId: string, data: UpsertSyllabusTopicInput) {
    return db.syllabusTopic.create({
      data: {
        courseId,
        documentId: data.documentId ?? null,
        parentId: data.parentId ?? null,
        title: data.title,
        description: data.description ?? null,
        weekNumber: data.weekNumber ?? null,
        pageStart: data.pageStart ?? null,
        pageEnd: data.pageEnd ?? null,
        order: data.order ?? 0,
      },
    });
  }

  async findById(id: string) {
    return db.syllabusTopic.findUnique({ where: { id } });
  }

  async update(id: string, data: UpsertSyllabusTopicInput) {
    return db.syllabusTopic.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        weekNumber: data.weekNumber,
        pageStart: data.pageStart,
        pageEnd: data.pageEnd,
        order: data.order,
        parentId: data.parentId,
        documentId: data.documentId,
      },
    });
  }

  async delete(id: string) {
    return db.syllabusTopic.delete({ where: { id } });
  }

  async deleteByDocumentId(documentId: string) {
    return db.syllabusTopic.deleteMany({ where: { documentId } });
  }
}
