import { FastifyInstance } from 'fastify';
import { DocumentsController } from './documents.controller';

const controller = new DocumentsController();

export async function documentsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/courses/:courseId/documents', controller.upload);
  fastify.get('/courses/:courseId/documents', controller.listByCourse);
  fastify.get('/documents/:documentId', controller.getById);
  fastify.delete('/documents/:documentId', controller.delete);
  fastify.post('/documents/:documentId/reprocess', controller.reprocess);
}
