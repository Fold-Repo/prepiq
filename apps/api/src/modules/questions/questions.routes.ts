import { FastifyInstance } from 'fastify';
import { QuestionsController } from './questions.controller';

const controller = new QuestionsController();

export async function questionsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/courses/:courseId/questions', controller.listByCourse);
  fastify.get('/questions/:questionId', controller.getById);
  fastify.post('/questions/:questionId/answer', controller.generateAnswer);
  fastify.post('/questions/:questionId/evaluate', controller.evaluateStudentAnswer);
  fastify.patch('/questions/:questionId', controller.update);
  fastify.delete('/questions/:questionId', controller.delete);
}
