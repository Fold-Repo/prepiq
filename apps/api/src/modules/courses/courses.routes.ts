import { FastifyInstance } from 'fastify';
import { CoursesController } from './courses.controller';

const controller = new CoursesController();

export async function coursesRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/', controller.create);
  fastify.get('/', controller.list);
  fastify.get('/:courseId', controller.getById);
  fastify.patch('/:courseId', controller.update);
  fastify.delete('/:courseId', controller.delete);
}
