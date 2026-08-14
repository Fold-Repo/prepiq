import { apiFetch } from './api';

export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'ESSAY' | 'CALCULATION' | 'TRUE_FALSE' | 'OTHER';
export type AnswerStyle = 'SHORT' | 'EXAM' | 'DETAILED' | 'STEP_BY_STEP';

export interface GeneratedAnswerData {
  id: string;
  questionId: string;
  userId: string;
  answer: string;
  answerStyle: AnswerStyle;
  confidence?: number | null;
  createdAt: string;
}

export interface QuestionCitationData {
  documentId: string;
  documentName: string;
  pageId: string;
  chunkId: string;
  pageNumber: number;
  excerpt: string;
  relevanceScore: number;
}

export interface StudentAnswerEvaluation {
  id: string;
  score: number;
  maxScore: number;
  strengths: string[];
  missingConcepts: string[];
  feedback: string;
  suggestedAnswer: string;
}

export interface GeneratedAnswerResult {
  answer: GeneratedAnswerData;
  citations: QuestionCitationData[];
}

export interface QuestionData {
  id: string;
  courseId: string;
  documentId?: string | null;
  questionNumber: string;
  content: string;
  type: QuestionType;
  marks?: number | null;
  createdAt: string;
  document?: {
    id: string;
    name: string;
    originalFilename: string;
  } | null;
  answers?: GeneratedAnswerData[];
  _count?: {
    answers: number;
  };
}

export async function getCourseQuestions(token: string, courseId: string): Promise<QuestionData[]> {
  return apiFetch<QuestionData[]>(`/courses/${courseId}/questions`, { method: 'GET' }, token);
}

export async function getQuestionById(token: string, questionId: string): Promise<QuestionData> {
  return apiFetch<QuestionData>(`/questions/${questionId}`, { method: 'GET' }, token);
}

export async function createQuestion(token: string, courseId: string, content: string, marks: number, type: string = 'SHORT_ANSWER'): Promise<QuestionData> {
  return apiFetch<QuestionData>('/questions', {
    method: 'POST',
    body: JSON.stringify({ courseId, content, marks, type }),
  }, token);
}

export async function generateQuestionAnswer(
  token: string,
  questionId: string,
  style: AnswerStyle = 'EXAM'
): Promise<GeneratedAnswerResult> {
  return apiFetch<GeneratedAnswerResult>(
    `/questions/${questionId}/answer`,
    {
      method: 'POST',
      body: JSON.stringify({ style }),
    },
    token
  );
}

export async function evaluateStudentAnswer(token: string, questionId: string, studentAnswer: string): Promise<StudentAnswerEvaluation> {
  return apiFetch<StudentAnswerEvaluation>(
    `/questions/${questionId}/evaluate`,
    {
      method: 'POST',
      body: JSON.stringify({ studentAnswer }),
    },
    token
  );
}

export async function updateQuestion(
  token: string,
  questionId: string,
  data: {
    questionNumber?: string;
    content?: string;
    marks?: number;
    type?: QuestionType;
  }
): Promise<QuestionData> {
  return apiFetch<QuestionData>(
    `/questions/${questionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    token
  );
}

export async function deleteQuestion(token: string, questionId: string): Promise<void> {
  await apiFetch(`/questions/${questionId}`, { method: 'DELETE' }, token);
}
