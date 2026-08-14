import { z } from 'zod';

export const generateQuizSchema = z.object({
  topic: z.string().optional(),
  questionCount: z.number().min(1).max(50).optional(),
  isMockExam: z.boolean().optional(),
  timeLimitMinutes: z.number().min(1).max(180).optional(),
});

export const submitAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      providedAnswer: z.string(),
    })
  ),
});

export const autosaveAttemptSchema = submitAttemptSchema;

export type GenerateQuizDto = z.infer<typeof generateQuizSchema>;
export type SubmitAttemptDto = z.infer<typeof submitAttemptSchema>;
