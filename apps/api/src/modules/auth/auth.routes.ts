import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';

const controller = new AuthController();

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', controller.register);
  fastify.post('/login', controller.login);
  fastify.post('/logout', controller.logout);

  fastify.get(
    '/me',
    { onRequest: [fastify.authenticate] },
    controller.getProfile
  );

  fastify.patch(
    '/settings',
    { onRequest: [fastify.authenticate] },
    controller.updateSettings
  );
}
