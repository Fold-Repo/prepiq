import { db, Question, QuestionType, GeneratedAnswer, AnswerStyle, StudentAnswer } from '@exam-ai/database';

export class QuestionsRepository {
  async create(data: {
    courseId: string;
    documentId?: string;
    questionNumber: string;
    content: string;
    type?: QuestionType;
    marks?: number;
    metadata?: any;
  }): Promise<Question> {
    return db.question.create({
      data: {
        courseId: data.courseId,
        documentId: data.documentId ?? null,
        questionNumber: data.questionNumber,
        content: data.content,
        type: data.type ?? QuestionType.SHORT_ANSWER,
        marks: data.marks ?? null,
        metadata: data.metadata ?? undefined,
      },
    });
  }

  async findByCourseIdAndUserId(courseId: string, userId: string): Promise<Question[]> {
    return db.question.findMany({
      where: {
        courseId,
        course: {
          userId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            originalFilename: true,
          },
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
        course: {
          userId,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
          },
        },
        document: {
          select: {
            id: true,
            name: true,
          },
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

  async update(
    id: string,
    data: {
      questionNumber?: string;
      content?: string;
      marks?: number;
      type?: QuestionType;
    }
  ): Promise<Question> {
    return db.question.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Question> {
    return db.question.delete({
      where: { id },
    });
  }
}
