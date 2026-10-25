import { db, Question, QuestionType, GeneratedAnswer, AnswerStyle, StudentAnswer, Prisma, OfficialAnswerSource, QuestionSource } from '@exam-ai/database';
import { CreateQuestionInput, UpdateQuestionInput } from '@exam-ai/validation';

export class QuestionsRepository {
  async create(data: CreateQuestionInput & { courseId: string }): Promise<Question> {
    return db.question.create({
      data: {
        courseId: data.courseId,
        documentId: data.documentId ?? null,
        pageId: data.pageId ?? null,
        sectionId: data.sectionId ?? null,
        syllabusTopicId: data.syllabusTopicId ?? null,
        questionNumber: data.questionNumber || 'Q',
        content: data.content,
        type: (data.type as QuestionType) ?? QuestionType.SHORT_ANSWER,
        marks: data.marks ?? null,
        options: data.options ?? undefined,
        correctOption: data.correctOption ?? null,
        officialAnswer: data.officialAnswer ?? null,
        officialAnswerSource: data.officialAnswer
          ? OfficialAnswerSource.MANUAL
          : OfficialAnswerSource.NONE,
        source: QuestionSource.MANUAL,
      },
    });
  }

  async findByCourseIdAndUserId(
    courseId: string,
    userId: string,
    filters: {
      documentId?: string;
      pageNumber?: number;
      sectionId?: string;
      topicId?: string;
      search?: string;
    } = {}
  ): Promise<Question[]> {
    const where: Prisma.QuestionWhereInput = {
      courseId,
      course: { userId },
    };

    if (filters.documentId) where.documentId = filters.documentId;
    if (filters.sectionId) where.sectionId = filters.sectionId;
    if (filters.topicId) where.syllabusTopicId = filters.topicId;
    if (filters.search) {
      where.OR = [
        { content: { contains: filters.search, mode: 'insensitive' } },
        { questionNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.pageNumber) {
      where.page = { pageNumber: filters.pageNumber };
    }

    return db.question.findMany({
      where,
      orderBy: [{ documentId: 'asc' }, { questionNumber: 'asc' }, { createdAt: 'desc' }],
      include: {
        document: {
          select: {
            id: true,
            name: true,
            originalFilename: true,
            type: true,
          },
        },
        page: {
          select: { id: true, pageNumber: true },
        },
        section: {
          select: { id: true, title: true },
        },
        syllabusTopic: {
          select: { id: true, title: true },
        },
        answers: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        studentAnswers: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            answers: true,
            studentAnswers: true,
          },
        },
      },
    });
  }

  async findByIdAndUserId(id: string, userId: string) {
    return db.question.findFirst({
      where: {
        id,
        course: { userId },
      },
      include: {
        course: {
          select: { id: true, name: true },
        },
        document: {
          select: { id: true, name: true, originalFilename: true, type: true },
        },
        page: {
          select: { id: true, pageNumber: true },
        },
        section: {
          select: { id: true, title: true },
        },
        syllabusTopic: {
          select: { id: true, title: true },
        },
        answers: {
          orderBy: { createdAt: 'desc' },
        },
        studentAnswers: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async createAnswer(data: {
    questionId: string;
    userId: string;
    answer: string;
    answerStyle: AnswerStyle;
    confidence?: number;
  }): Promise<GeneratedAnswer> {
    return db.generatedAnswer.create({
      data: {
        questionId: data.questionId,
        userId: data.userId,
        answer: data.answer,
        answerStyle: data.answerStyle,
        confidence: data.confidence ?? null,
      },
    });
  }

  async createStudentAnswer(data: {
    questionId: string;
    userId: string;
    answer: string;
    score: number;
    maxScore: number;
    strengths?: any;
    missingConcepts?: any;
    feedback: string;
    suggestedAnswer: string;
  }): Promise<StudentAnswer> {
    return db.studentAnswer.create({
      data: {
        questionId: data.questionId,
        userId: data.userId,
        answer: data.answer,
        score: data.score,
        maxScore: data.maxScore,
        strengths: data.strengths ?? [],
        missingConcepts: data.missingConcepts ?? [],
        feedback: data.feedback,
        suggestedAnswer: data.suggestedAnswer,
      },
    });
  }

  async update(id: string, data: UpdateQuestionInput): Promise<Question> {
    return db.question.update({
      where: { id },
      data: {
        questionNumber: data.questionNumber,
        content: data.content,
        marks: data.marks,
        type: data.type as QuestionType | undefined,
        officialAnswer: data.officialAnswer === undefined ? undefined : data.officialAnswer,
        officialAnswerSource:
          data.officialAnswer === undefined
            ? undefined
            : data.officialAnswer
              ? OfficialAnswerSource.MANUAL
              : OfficialAnswerSource.NONE,
        options: data.options,
        correctOption: data.correctOption,
        documentId: data.documentId === undefined ? undefined : data.documentId,
        pageId: data.pageId === undefined ? undefined : data.pageId,
        sectionId: data.sectionId === undefined ? undefined : data.sectionId,
        syllabusTopicId: data.syllabusTopicId === undefined ? undefined : data.syllabusTopicId,
      },
    });
  }

  async delete(id: string): Promise<Question> {
    return db.question.delete({ where: { id } });
  }
}
