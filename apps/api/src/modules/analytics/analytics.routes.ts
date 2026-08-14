import { FastifyInstance } from 'fastify';
import { AnalyticsController } from './analytics.controller';

export async function analyticsRoutes(app: FastifyInstance) {
  const controller = new AnalyticsController();

  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  app.get('/courses/:courseId/analytics', controller.getCourseAnalytics as any);
}
