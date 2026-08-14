import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  description: z.string().optional(),
  academicYear: z.string().optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const chatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1, 'Message cannot be empty'),
});

export const generateAnswerSchema = z.object({
  style: z.enum(['SHORT', 'EXAM', 'DETAILED', 'STEP_BY_STEP']).default('EXAM'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type GenerateAnswerInput = z.infer<typeof generateAnswerSchema>;
