import { FastifyRequest, FastifyReply } from 'fastify';
import { QuestionsService } from './questions.service';
import { QuestionType, AnswerStyle } from '@exam-ai/database';
import { formatSuccessResponse, formatErrorResponse } from '@exam-ai/shared';

const questionsService = new QuestionsService();

export class QuestionsController {
  async listByCourse(
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { courseId } = request.params;

    const questions = await questionsService.getCourseQuestions(courseId, userPayload.id);
    return reply.status(200).send(formatSuccessResponse(questions));
  }

  async getById(
    request: FastifyRequest<{ Params: { questionId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { questionId } = request.params;

    const question = await questionsService.getQuestionDetails(questionId, userPayload.id);
    return reply.status(200).send(formatSuccessResponse(question));
  }

  async generateAnswer(
    request: FastifyRequest<{
      Params: { questionId: string };
      Body: { style?: AnswerStyle };
    }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { questionId } = request.params;
    const { style } = request.body || {};

    const result = await questionsService.generateAnswerForQuestion(questionId, userPayload.id, style);
    return reply.status(200).send(formatSuccessResponse(result));
  }

  async evaluateStudentAnswer(
    request: FastifyRequest<{
      Params: { questionId: string };
      Body: { studentAnswer: string };
    }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { questionId } = request.params;
    const { studentAnswer } = request.body || {};

    if (!studentAnswer || !studentAnswer.trim()) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', 'Student answer text is required', request.id)
      );
    }

    const evaluation = await questionsService.evaluateStudentAnswer(
      questionId,
      userPayload.id,
      studentAnswer
    );
    return reply.status(200).send(formatSuccessResponse(evaluation));
  }

  async update(
    request: FastifyRequest<{
      Params: { questionId: string };
      Body: {
        questionNumber?: string;
        content?: string;
        marks?: number;
        type?: QuestionType;
      };
    }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { questionId } = request.params;

    const updated = await questionsService.updateQuestion(questionId, userPayload.id, request.body);
    return reply.status(200).send(formatSuccessResponse(updated));
  }

  async delete(
    request: FastifyRequest<{ Params: { questionId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { questionId } = request.params;

    await questionsService.deleteQuestion(questionId, userPayload.id);
    return reply.status(200).send(formatSuccessResponse({ message: 'Question deleted successfully' }));
  }
}
