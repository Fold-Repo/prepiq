import { FastifyRequest, FastifyReply } from 'fastify';
import { CoursesService } from './courses.service';
import { createCourseSchema, updateCourseSchema } from '@exam-ai/validation';
import { formatSuccessResponse, formatErrorResponse } from '@exam-ai/shared';

const coursesService = new CoursesService();

export class CoursesController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user;
    const parseResult = createCourseSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parseResult.error.errors[0].message, request.id)
      );
    }

    const course = await coursesService.createCourse(userPayload.id, parseResult.data);
    return reply.status(201).send(formatSuccessResponse(course));
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user;
    const courses = await coursesService.getStudentCourses(userPayload.id);
    return reply.status(200).send(formatSuccessResponse(courses));
  }

  async getById(request: FastifyRequest<{ Params: { courseId: string } }>, reply: FastifyReply) {
    const userPayload = request.user;
    const { courseId } = request.params;

    const course = await coursesService.getCourseDetails(courseId, userPayload.id);
    return reply.status(200).send(formatSuccessResponse(course));
  }

  async update(
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { courseId } = request.params;

    const parseResult = updateCourseSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parseResult.error.errors[0].message, request.id)
      );
    }

    const updated = await coursesService.updateCourse(courseId, userPayload.id, parseResult.data);
    return reply.status(200).send(formatSuccessResponse(updated));
  }

  async delete(
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { courseId } = request.params;

    await coursesService.deleteCourse(courseId, userPayload.id);
    return reply.status(200).send(formatSuccessResponse({ message: 'Course deleted successfully' }));
  }
}
