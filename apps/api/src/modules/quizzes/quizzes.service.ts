import { db } from '@exam-ai/database';
import { generateQuiz, gradeShortAnswer, GeneratedQuiz } from '@exam-ai/ai';
import { GenerateQuizDto, SubmitAttemptDto } from './quizzes.schema';
import { QuestionType, QuizAttemptStatus } from '@prisma/client';

export class QuizzesService {
  async generateQuiz(courseId: string, userId: string, input: GenerateQuizDto) {
    // 1. Fetch chunks for the course context
    const [chunks, user] = await Promise.all([
      db.documentChunk.findMany({
        where: { courseId },
        take: 20, // Naive approach for MVP, grab 20 chunks
      }),
      db.user.findUnique({ where: { id: userId } })
    ]);
    
    const context = chunks.map((c: any) => c.content).join('\n\n');
    
    // 2. Generate quiz
    const generated: GeneratedQuiz = await generateQuiz({
      courseContext: context,
      topic: input.topic,
      questionCount: input.questionCount || (input.isMockExam ? 20 : 5),
      aiProvider: user?.preferredAI || 'OPENAI'
    });

    // 3. Save to database
    return db.quiz.create({
      data: {
        courseId,
        userId,
        title: generated.title || (input.isMockExam ? 'Mock Exam' : 'Generated Quiz'),
        description: generated.description,
        isMockExam: input.isMockExam || false,
        timeLimitMinutes: input.timeLimitMinutes || null,
        questions: {
          create: generated.questions.map((q: any) => ({
            content: q.content,
            type: q.type as QuestionType,
            options: q.options || undefined,
            correctOption: q.correctOption,
            explanation: q.explanation,
            topic: q.topic || 'General',
            marks: q.marks || 1,
          }))
        }
      },
      include: {
        questions: true,
      }
    });
  }

  async getQuizzes(courseId: string, userId: string) {
    return db.quiz.findMany({
      where: { courseId, userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { questions: true, attempts: true }
        }
      }
    });
  }

  async getQuizById(quizId: string, courseId: string, userId: string) {
    const quiz = await db.quiz.findFirst({
      where: { id: quizId, courseId, userId },
      include: {
        questions: true,
        attempts: {
          orderBy: { startedAt: 'desc' }
        }
      }
    });
    if (!quiz) throw new Error('Quiz not found');
    return quiz;
  }

  async startAttempt(quizId: string, userId: string) {
    return db.quizAttempt.create({
      data: {
        quizId,
        userId,
        status: QuizAttemptStatus.IN_PROGRESS,
      }
    });
  }

  async submitAttempt(attemptId: string, userId: string, input: SubmitAttemptDto) {
    const attempt = await db.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      include: {
        quiz: {
          include: { questions: true }
        }
      }
    });

    if (!attempt) throw new Error('Attempt not found');
    if (attempt.status === QuizAttemptStatus.COMPLETED) throw new Error('Attempt already completed');

    // Time limit validation for mock exams
    if (attempt.quiz.isMockExam && attempt.quiz.timeLimitMinutes) {
      const now = new Date().getTime();
      const started = new Date(attempt.startedAt).getTime();
      const limitMs = attempt.quiz.timeLimitMinutes * 60 * 1000;
      // Add a 2-minute grace period for network latency
      if (now - started > limitMs + 2 * 60 * 1000) {
        // We could throw an error, but it's better to accept what they have and maybe cap score
        // For MVP, we'll just log it or proceed. We'll proceed.
      }
    }

    let totalScore = 0;
    let maxScore = 0;
    
    const answersData = [];

    // Course context could be fetched here again for grading short answers
    // For simplicity we will just use basic context or grade on question basis
    
    for (const ans of input.answers) {
      const question = attempt.quiz.questions.find((q: any) => q.id === ans.questionId);
      if (!question) continue;
      
      maxScore += question.marks;

      if (question.type === QuestionType.MCQ) {
        const isCorrect = ans.providedAnswer === question.correctOption;
        const scoreAwarded = isCorrect ? question.marks : 0;
        totalScore += scoreAwarded;
        
        answersData.push({
          questionId: question.id,
          providedAnswer: ans.providedAnswer,
          isCorrect,
          scoreAwarded,
          feedback: isCorrect ? 'Correct' : 'Incorrect',
        });
      } else if (question.type === QuestionType.SHORT_ANSWER) {
        const user = await db.user.findUnique({ where: { id: userId } });
        const grading = await gradeShortAnswer(
          question.content, 
          ans.providedAnswer, 
          question.explanation || '', // using explanation as reference answer/context
          question.marks,
          user?.preferredAI || 'OPENAI'
        );
        
        totalScore += grading.score;
        answersData.push({
          questionId: question.id,
          providedAnswer: ans.providedAnswer,
          isCorrect: grading.score > 0,
          scoreAwarded: grading.score,
          feedback: grading.feedback,
        });
      }
    }

    return db.quizAttempt.update({
      where: { id: attemptId },
      data: {
        status: QuizAttemptStatus.COMPLETED,
        completedAt: new Date(),
        score: totalScore,
        maxScore,
        answers: {
          create: answersData
        }
      },
      include: {
        answers: true
      }
    });
  }

  async autosaveAttempt(attemptId: string, userId: string, input: SubmitAttemptDto) {
    const attempt = await db.quizAttempt.findFirst({
      where: { id: attemptId, userId },
      include: { quiz: true }
    });

    if (!attempt) throw new Error('Attempt not found');
    if (attempt.status === QuizAttemptStatus.COMPLETED) throw new Error('Attempt already completed');

    return db.quizAttempt.update({
      where: { id: attemptId },
      data: {
        autosaveData: input.answers as any,
        lastSavedAt: new Date(),
      }
    });
  }
}
