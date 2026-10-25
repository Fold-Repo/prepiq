import { FastifyRequest, FastifyReply } from 'fastify';
import { SyllabusService } from './syllabus.service';
import { formatSuccessResponse, formatErrorResponse } from '@exam-ai/shared';
import { upsertSyllabusTopicSchema } from '@exam-ai/validation';

const syllabusService = new SyllabusService();

export class SyllabusController {
  async list(
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) {
    const topics = await syllabusService.list(request.params.courseId, request.user.id);
    return reply.status(200).send(formatSuccessResponse(topics));
  }

  async create(
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) {
    const parsed = upsertSyllabusTopicSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid body', request.id)
      );
    }
    const topic = await syllabusService.create(request.params.courseId, request.user.id, parsed.data);
    return reply.status(201).send(formatSuccessResponse(topic));
  }

  async update(
    request: FastifyRequest<{ Params: { topicId: string } }>,
    reply: FastifyReply
  ) {
    const parsed = upsertSyllabusTopicSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid body', request.id)
      );
    }
    const topic = await syllabusService.update(request.params.topicId, request.user.id, parsed.data);
    return reply.status(200).send(formatSuccessResponse(topic));
  }

  async delete(
    request: FastifyRequest<{ Params: { topicId: string } }>,
    reply: FastifyReply
  ) {
    await syllabusService.delete(request.params.topicId, request.user.id);
    return reply.status(200).send(formatSuccessResponse({ message: 'Syllabus topic deleted' }));
  }

  async extract(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const result = await syllabusService.extractFromDocument(
      request.params.documentId,
      request.user.id
    );
    return reply.status(200).send(formatSuccessResponse(result));
  }
}
