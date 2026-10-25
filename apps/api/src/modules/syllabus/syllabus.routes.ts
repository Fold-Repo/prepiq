import { FastifyInstance } from 'fastify';
import { SyllabusController } from './syllabus.controller';

const controller = new SyllabusController();

export async function syllabusRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/courses/:courseId/syllabus', controller.list);
  fastify.post('/courses/:courseId/syllabus', controller.create);
  fastify.patch('/syllabus/:topicId', controller.update);
  fastify.delete('/syllabus/:topicId', controller.delete);
  fastify.post('/documents/:documentId/extract-syllabus', controller.extract);
}
