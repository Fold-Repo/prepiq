import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { formatErrorResponse } from '@exam-ai/shared';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: UserPayload;
  }
}

export default fp(async function (fastify: FastifyInstance) {
  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send(
          formatErrorResponse('UNAUTHORIZED', 'Invalid or missing authentication token', request.id)
        );
      }
    }
  );
});
