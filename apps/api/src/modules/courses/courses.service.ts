import { CoursesRepository } from './courses.repository';
import { CreateCourseInput, UpdateCourseInput } from '@exam-ai/validation';

export class CoursesService {
  private repository: CoursesRepository;

  constructor() {
    this.repository = new CoursesRepository();
  }

  async createCourse(userId: string, input: CreateCourseInput) {
    return this.repository.create({
      userId,
      name: input.name,
      description: input.description,
      academicYear: input.academicYear,
    });
  }

  async getStudentCourses(userId: string) {
    return this.repository.findByUserId(userId);
  }

  async getCourseDetails(courseId: string, userId: string) {
    const course = await this.repository.findByIdAndUserId(courseId, userId);
    if (!course) {
      const error: any = new Error('Course not found or access denied');
      error.statusCode = 404;
      error.code = 'COURSE_NOT_FOUND';
      throw error;
    }
    return course;
  }

  async updateCourse(courseId: string, userId: string, input: UpdateCourseInput) {
    // Ensure course exists and belongs to user
    await this.getCourseDetails(courseId, userId);
    return this.repository.update(courseId, userId, input);
  }

  async deleteCourse(courseId: string, userId: string) {
    // Ensure course exists and belongs to user
    await this.getCourseDetails(courseId, userId);
    return this.repository.delete(courseId, userId);
  }
}
