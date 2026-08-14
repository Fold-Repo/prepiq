import { FastifyInstance } from 'fastify';
import { ConversationsController } from './conversations.controller';

const controller = new ConversationsController();

export async function conversationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/courses/:courseId/conversations', controller.create);
  fastify.get('/courses/:courseId/conversations', controller.listByCourse);
  fastify.get('/conversations/:conversationId', controller.getById);
  fastify.post('/courses/:courseId/chat', controller.chat);
  fastify.delete('/conversations/:conversationId', controller.delete);
}
