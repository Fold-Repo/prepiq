import { FastifyInstance } from 'fastify';
import { QuizzesController } from './quizzes.controller';

export async function quizzesRoutes(app: FastifyInstance) {
  const controller = new QuizzesController();

  app.addHook('onRequest', app.authenticate);

  // We are mounting this at /api/v1, so the path should be /courses/:courseId/quizzes
  // In server.ts we should do: await app.register(quizzesRoutes, { prefix: '/api/v1' });
  
  app.post(
    '/courses/:courseId/quizzes/generate',
    controller.generateQuiz as any
  );

  app.get(
    '/courses/:courseId/quizzes',
    controller.getQuizzes as any
  );

  app.get(
    '/courses/:courseId/quizzes/:quizId',
    controller.getQuizById as any
  );

  app.post(
    '/courses/:courseId/quizzes/:quizId/attempts',
    controller.startAttempt as any
  );

  app.put(
    '/courses/:courseId/quizzes/:quizId/attempts/:attemptId',
    controller.submitAttempt as any
  );

  app.put(
    '/courses/:courseId/quizzes/:quizId/attempts/:attemptId/autosave',
    controller.autosaveAttempt as any
  );
}
