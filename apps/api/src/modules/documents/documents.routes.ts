import { FastifyInstance } from 'fastify';
import { DocumentsController } from './documents.controller';

const controller = new DocumentsController();

export async function documentsRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/courses/:courseId/documents', controller.upload);
  fastify.get('/courses/:courseId/documents', controller.listByCourse);
  fastify.get('/documents/:documentId', controller.getById);
  fastify.patch('/documents/:documentId', controller.update);
  fastify.delete('/documents/:documentId', controller.delete);
  fastify.post('/documents/:documentId/reprocess', controller.reprocess);
  fastify.get('/documents/:documentId/file', controller.file);

  fastify.get('/documents/:documentId/pages', controller.listPages);
  fastify.get('/documents/:documentId/pages/:pageNumber', controller.getPage);
  fastify.patch('/documents/:documentId/pages/:pageNumber', controller.updatePage);
  fastify.post('/documents/:documentId/pages/:pageNumber/reindex', controller.reindexPage);

  fastify.get('/documents/:documentId/sections', controller.listSections);
  fastify.post('/documents/:documentId/sections', controller.createSection);
  fastify.patch('/sections/:sectionId', controller.updateSection);
  fastify.delete('/sections/:sectionId', controller.deleteSection);
}
