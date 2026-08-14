import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter } from '@bull-board/fastify';
import { QueueService } from './services/queue.service';
import dotenv from 'dotenv';
import { formatSuccessResponse, formatErrorResponse } from '@exam-ai/shared';
import authenticatePlugin from './plugins/authenticate';
import { authRoutes } from './modules/auth/auth.routes';
import { coursesRoutes } from './modules/courses/courses.routes';
import { documentsRoutes } from './modules/documents/documents.routes';
import { conversationsRoutes } from './modules/conversations/conversations.routes';
import { questionsRoutes } from './modules/questions/questions.routes';
import { quizzesRoutes } from './modules/quizzes/quizzes.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

export async function buildServer() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  await app.register(fastifyJwt, {
    secret: JWT_SECRET,
  });

  await app.register(helmet, {
    crossOriginResourcePolicy: false, // Need this false for some local dev assets/CORS sometimes
  });

  await app.register(rateLimit, {
    max: 100, // 100 requests
    timeWindow: '1 minute',
  });

  await app.register(authenticatePlugin);

  // Setup Bull Board for Queue Monitoring
  const queueService = new QueueService();
  const documentQueue = queueService.getDocumentQueue();
  if (documentQueue) {
    const serverAdapter = new FastifyAdapter();
    createBullBoard({
      queues: [new BullMQAdapter(documentQueue)],
      serverAdapter,
    });
    serverAdapter.setBasePath('/admin/queues');
    app.register(serverAdapter.registerPlugin());
  }

  // Health check endpoint
  app.get('/health', async () => {
    return formatSuccessResponse({
      status: 'ok',
      service: 'exam-ai-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API modules under /api/v1
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(coursesRoutes, { prefix: '/api/v1/courses' });
  await app.register(documentsRoutes, { prefix: '/api/v1' });
  await app.register(conversationsRoutes, { prefix: '/api/v1' });
  await app.register(questionsRoutes, { prefix: '/api/v1' });
  await app.register(quizzesRoutes, { prefix: '/api/v1' });
  await app.register(analyticsRoutes, { prefix: '/api/v1' });

  app.setErrorHandler((error, request, reply) => {
    // Structured JSON logging for production monitoring tools
    app.log.error({
      err: error,
      request: {
        method: request.method,
        url: request.url,
        query: request.query,
        params: request.params,
        ip: request.ip,
      }
    }, error.message);

    reply.status(error.statusCode || 500).send(
      formatErrorResponse(
        error.code || 'INTERNAL_SERVER_ERROR',
        error.message || 'An unexpected error occurred',
        request.id
      )
    );
  });

  return app;
}

async function start() {
  const server = await buildServer();
  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`🚀 Fastify API running on http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  start();
  // Boot the worker process alongside the API server
  require('./worker');
}
