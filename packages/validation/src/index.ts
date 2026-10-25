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
export const updateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['LECTURE', 'PAST_QUESTION', 'QUESTION_ANSWER', 'SYLLABUS', 'OTHER']).optional(),
  contentStartPage: z.number().int().positive().nullable().optional(),
  contentEndPage: z.number().int().positive().nullable().optional(),
});

export const updatePageContentSchema = z.object({
  content: z.string(),
});

export const upsertSectionSchema = z.object({
  title: z.string().min(1),
  pageStart: z.number().int().positive(),
  pageEnd: z.number().int().positive(),
  order: z.number().int().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export const upsertSyllabusTopicSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  weekNumber: z.number().int().positive().optional().nullable(),
  pageStart: z.number().int().positive().optional().nullable(),
  pageEnd: z.number().int().positive().optional().nullable(),
  order: z.number().int().optional(),
  parentId: z.string().uuid().nullable().optional(),
  documentId: z.string().uuid().nullable().optional(),
});

export const createQuestionSchema = z.object({
  questionNumber: z.string().optional(),
  content: z.string().min(1, 'Question content is required'),
  marks: z.number().int().positive().optional(),
  type: z.enum(['MCQ', 'SHORT_ANSWER', 'ESSAY', 'CALCULATION', 'TRUE_FALSE', 'OTHER']).optional(),
  officialAnswer: z.string().optional().nullable(),
  options: z.array(z.string()).optional(),
  correctOption: z.string().optional().nullable(),
  documentId: z.string().uuid().optional().nullable(),
  pageId: z.string().uuid().optional().nullable(),
  sectionId: z.string().uuid().optional().nullable(),
  syllabusTopicId: z.string().uuid().optional().nullable(),
});

export const updateQuestionSchema = createQuestionSchema.partial();

export const reprocessDocumentSchema = z.object({
  forceIndex: z.boolean().optional(),
  contentStartPage: z.number().int().positive().nullable().optional(),
  contentEndPage: z.number().int().positive().nullable().optional(),
});

export type GenerateAnswerInput = z.infer<typeof generateAnswerSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type UpdatePageContentInput = z.infer<typeof updatePageContentSchema>;
export type UpsertSectionInput = z.infer<typeof upsertSectionSchema>;
export type UpsertSyllabusTopicInput = z.infer<typeof upsertSyllabusTopicSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ReprocessDocumentInput = z.infer<typeof reprocessDocumentSchema>;
