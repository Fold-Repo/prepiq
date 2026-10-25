import { FastifyRequest, FastifyReply } from 'fastify';
import { QuestionsService } from './questions.service';
import { AnswerStyle } from '@exam-ai/database';
import { formatSuccessResponse, formatErrorResponse } from '@exam-ai/shared';
import { createQuestionSchema, updateQuestionSchema } from '@exam-ai/validation';

const questionsService = new QuestionsService();

export class QuestionsController {
  async listByCourse(
    request: FastifyRequest<{
      Params: { courseId: string };
      Querystring: {
        documentId?: string;
        page?: string;
        sectionId?: string;
        topicId?: string;
        search?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const { documentId, page, sectionId, topicId, search } = request.query;
    const questions = await questionsService.getCourseQuestions(
      request.params.courseId,
      request.user.id,
      {
        documentId,
        pageNumber: page ? Number(page) : undefined,
        sectionId,
        topicId,
        search,
      }
    );
    return reply.status(200).send(formatSuccessResponse(questions));
  }

  async create(
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) {
    const parsed = createQuestionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid body', request.id)
      );
    }
    const question = await questionsService.createQuestion(
      request.params.courseId,
      request.user.id,
      parsed.data
    );
    return reply.status(201).send(formatSuccessResponse(question));
  }

  async getById(
    request: FastifyRequest<{ Params: { questionId: string } }>,
    reply: FastifyReply
  ) {
    const question = await questionsService.getQuestionDetails(
      request.params.questionId,
      request.user.id
    );
    return reply.status(200).send(formatSuccessResponse(question));
  }

  async generateAnswer(
    request: FastifyRequest<{
      Params: { questionId: string };
      Body: { style?: AnswerStyle };
    }>,
    reply: FastifyReply
  ) {
    const { questionId } = request.params;
    const { style } = request.body || {};
    const result = await questionsService.generateAnswerForQuestion(questionId, request.user.id, style);
    return reply.status(200).send(formatSuccessResponse(result));
  }

  async evaluateStudentAnswer(
    request: FastifyRequest<{
      Params: { questionId: string };
      Body: { studentAnswer: string };
    }>,
    reply: FastifyReply
  ) {
    const { studentAnswer } = request.body || {};
    if (!studentAnswer || !studentAnswer.trim()) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', 'Student answer text is required', request.id)
      );
    }

    const evaluation = await questionsService.evaluateStudentAnswer(
      request.params.questionId,
      request.user.id,
      studentAnswer
    );
    return reply.status(200).send(formatSuccessResponse(evaluation));
  }

  async update(
    request: FastifyRequest<{ Params: { questionId: string } }>,
    reply: FastifyReply
  ) {
    const parsed = updateQuestionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid body', request.id)
      );
    }
    const updated = await questionsService.updateQuestion(
      request.params.questionId,
      request.user.id,
      parsed.data
    );
    return reply.status(200).send(formatSuccessResponse(updated));
  }

  async delete(
    request: FastifyRequest<{ Params: { questionId: string } }>,
    reply: FastifyReply
  ) {
    await questionsService.deleteQuestion(request.params.questionId, request.user.id);
    return reply.status(200).send(formatSuccessResponse({ message: 'Question deleted successfully' }));
  }
}
