import { QuestionsRepository } from './questions.repository';
import { CoursesService } from '../courses/courses.service';
import { AnswerStyle } from '@exam-ai/database';
import { generateExamAnswerQuery, evaluateStudentAnswerQuery } from '@exam-ai/rag';
import { CreateQuestionInput, UpdateQuestionInput } from '@exam-ai/validation';

export class QuestionsService {
  private repository: QuestionsRepository;
  private coursesService: CoursesService;

  constructor() {
    this.repository = new QuestionsRepository();
    this.coursesService = new CoursesService();
  }

  async getCourseQuestions(
    courseId: string,
    userId: string,
    filters: {
      documentId?: string;
      pageNumber?: number;
      sectionId?: string;
      topicId?: string;
      search?: string;
    } = {}
  ) {
    await this.coursesService.getCourseDetails(courseId, userId);
    return this.repository.findByCourseIdAndUserId(courseId, userId, filters);
  }

  async createQuestion(courseId: string, userId: string, input: CreateQuestionInput) {
    await this.coursesService.getCourseDetails(courseId, userId);
    return this.repository.create({ ...input, courseId });
  }

  async getQuestionDetails(questionId: string, userId: string) {
    const question = await this.repository.findByIdAndUserId(questionId, userId);
    if (!question) {
      const error: any = new Error('Question not found or access denied');
      error.statusCode = 404;
      error.code = 'QUESTION_NOT_FOUND';
      throw error;
    }
    return question;
  }

  async generateAnswerForQuestion(
    questionId: string,
    userId: string,
    style?: AnswerStyle
  ) {
    const question = await this.getQuestionDetails(questionId, userId);

    const ragResult = await generateExamAnswerQuery({
      userId,
      courseId: question.courseId,
      questionText: question.content,
      answerStyle: (style as any) || 'EXAM',
      maxChunks: 6,
    });

    const savedAnswer = await this.repository.createAnswer({
      questionId,
      userId,
      answer: ragResult.answerText,
      answerStyle: (style as AnswerStyle) || AnswerStyle.EXAM,
      confidence: ragResult.confidenceScore,
    });

    return {
      answer: savedAnswer,
      citations: ragResult.citations,
    };
  }

  async evaluateStudentAnswer(
    questionId: string,
    userId: string,
    studentAnswer: string
  ) {
    const question = await this.getQuestionDetails(questionId, userId);

    const evalResult = await evaluateStudentAnswerQuery({
      userId,
      courseId: question.courseId,
      questionText: question.content,
      studentAnswer,
      maxMarks: question.marks || 10,
    });

    const savedEvaluation = await this.repository.createStudentAnswer({
      questionId,
      userId,
      answer: studentAnswer,
      score: evalResult.score,
      maxScore: evalResult.maxScore,
      strengths: evalResult.strengths,
      missingConcepts: evalResult.missingConcepts,
      feedback: evalResult.feedback,
      suggestedAnswer: evalResult.suggestedAnswer,
    });

    return savedEvaluation;
  }

  async updateQuestion(questionId: string, userId: string, input: UpdateQuestionInput) {
    await this.getQuestionDetails(questionId, userId);
    return this.repository.update(questionId, input);
  }

  async deleteQuestion(questionId: string, userId: string) {
    await this.getQuestionDetails(questionId, userId);
    return this.repository.delete(questionId);
  }
}
