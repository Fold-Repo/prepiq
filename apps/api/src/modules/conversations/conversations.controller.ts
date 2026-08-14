import { FastifyRequest, FastifyReply } from 'fastify';
import { ConversationsService } from './conversations.service';
import { chatRequestSchema } from '@exam-ai/validation';
import { formatSuccessResponse, formatErrorResponse } from '@exam-ai/shared';

const conversationsService = new ConversationsService();

export class ConversationsController {
  async create(
    request: FastifyRequest<{ Params: { courseId: string }; Body: { title?: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { courseId } = request.params;
    const { title } = request.body || {};

    const conv = await conversationsService.createConversation(userPayload.id, courseId, title);
    return reply.status(201).send(formatSuccessResponse(conv));
  }

  async listByCourse(
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { courseId } = request.params;

    const conversations = await conversationsService.getCourseConversations(userPayload.id, courseId);
    return reply.status(200).send(formatSuccessResponse(conversations));
  }

  async getById(
    request: FastifyRequest<{ Params: { conversationId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { conversationId } = request.params;

    const conversation = await conversationsService.getConversationMessages(userPayload.id, conversationId);
    return reply.status(200).send(formatSuccessResponse(conversation));
  }

  async chat(
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { courseId } = request.params;

    const parseResult = chatRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parseResult.error.errors[0].message, request.id)
      );
    }

    const chatResponse = await conversationsService.processChatMessage({
      userId: userPayload.id,
      courseId,
      conversationId: parseResult.data.conversationId,
      message: parseResult.data.message,
    });

    return reply.status(200).send(formatSuccessResponse(chatResponse));
  }

  async delete(
    request: FastifyRequest<{ Params: { conversationId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { conversationId } = request.params;

    await conversationsService.deleteConversation(userPayload.id, conversationId);
    return reply.status(200).send(
      formatSuccessResponse({ message: 'Conversation deleted successfully' })
    );
  }
}
