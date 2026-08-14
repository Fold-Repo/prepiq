import { FastifyRequest, FastifyReply } from 'fastify';
import { QuizzesService } from './quizzes.service';
import { generateQuizSchema, submitAttemptSchema, autosaveAttemptSchema } from './quizzes.schema';
import { formatSuccessResponse } from '@exam-ai/shared';

export class QuizzesController {
  private quizzesService: QuizzesService;

  constructor() {
    this.quizzesService = new QuizzesService();
  }

  generateQuiz = async (
    request: FastifyRequest<{ Params: { courseId: string }; Body: any }>,
    reply: FastifyReply
  ) => {
    const data = generateQuizSchema.parse(request.body);
    const userId = request.user.id;
    const { courseId } = request.params;

    const quiz = await this.quizzesService.generateQuiz(courseId, userId, data);
    return reply.status(201).send(formatSuccessResponse(quiz));
  };

  getQuizzes = async (
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.id;
    const { courseId } = request.params;

    const quizzes = await this.quizzesService.getQuizzes(courseId, userId);
    return reply.status(200).send(formatSuccessResponse(quizzes));
  };

  getQuizById = async (
    request: FastifyRequest<{ Params: { courseId: string; quizId: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.id;
    const { courseId, quizId } = request.params;

    const quiz = await this.quizzesService.getQuizById(quizId, courseId, userId);
    return reply.status(200).send(formatSuccessResponse(quiz));
  };

  startAttempt = async (
    request: FastifyRequest<{ Params: { courseId: string; quizId: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.id;
    const { quizId } = request.params;

    const attempt = await this.quizzesService.startAttempt(quizId, userId);
    return reply.status(201).send(formatSuccessResponse(attempt));
  };

  submitAttempt = async (
    request: FastifyRequest<{ Params: { courseId: string; quizId: string; attemptId: string }; Body: any }>,
    reply: FastifyReply
  ) => {
    const data = submitAttemptSchema.parse(request.body);
    const userId = request.user.id;
    const { attemptId } = request.params;

    const attempt = await this.quizzesService.submitAttempt(attemptId, userId, data);
    return reply.status(200).send(formatSuccessResponse(attempt));
  };

  autosaveAttempt = async (
    request: FastifyRequest<{ Params: { attemptId: string }; Body: any }>,
    reply: FastifyReply
  ) => {
    const data = autosaveAttemptSchema.parse(request.body);
    const userId = request.user.id;
    const { attemptId } = request.params;

    const attempt = await this.quizzesService.autosaveAttempt(attemptId, userId, data);
    return reply.status(200).send(formatSuccessResponse(attempt));
  };
}
