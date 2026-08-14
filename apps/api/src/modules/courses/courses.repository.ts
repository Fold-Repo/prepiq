import { db, Course } from '@exam-ai/database';

export class CoursesRepository {
  async create(data: {
    userId: string;
    name: string;
    description?: string;
    academicYear?: string;
  }): Promise<Course> {
    return db.course.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description,
        academicYear: data.academicYear,
      },
    });
  }

  async findByUserId(userId: string): Promise<Course[]> {
    return db.course.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            documents: true,
            questions: true,
          },
        },
      },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Course | null> {
    return db.course.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            documents: true,
            questions: true,
            conversations: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: { name?: string; description?: string; academicYear?: string }
  ): Promise<Course> {
    return db.course.update({
      where: {
        id,
        userId,
      },
      data,
    });
  }

  async delete(id: string, userId: string): Promise<Course> {
    return db.course.delete({
      where: {
        id,
        userId,
      },
    });
  }
}
