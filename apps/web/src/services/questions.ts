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
  pageId?: string | null;
  sectionId?: string | null;
  syllabusTopicId?: string | null;
  questionNumber: string;
  content: string;
  type: QuestionType;
  marks?: number | null;
  options?: Array<{ label: string; text: string }> | string[] | null;
  correctOption?: string | null;
  officialAnswer?: string | null;
  officialAnswerSource?: 'NONE' | 'EXTRACTED' | 'CONTEXT' | 'AI' | 'MANUAL';
  metadata?: { syllabusRef?: string } | null;
  source?: 'EXTRACTED' | 'MANUAL';
  createdAt: string;
  document?: {
    id: string;
    name: string;
    originalFilename?: string;
    type?: string;
  } | null;
  page?: { id: string; pageNumber: number } | null;
  section?: { id: string; title: string } | null;
  syllabusTopic?: { id: string; title: string } | null;
  answers?: GeneratedAnswerData[];
  _count?: {
    answers: number;
  };
}

export async function getCourseQuestions(
  token: string,
  courseId: string,
  filters: {
    documentId?: string;
    page?: number;
    sectionId?: string;
    topicId?: string;
    search?: string;
  } = {}
): Promise<QuestionData[]> {
  const params = new URLSearchParams();
  if (filters.documentId) params.set('documentId', filters.documentId);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.sectionId) params.set('sectionId', filters.sectionId);
  if (filters.topicId) params.set('topicId', filters.topicId);
  if (filters.search) params.set('search', filters.search);
  const qs = params.toString();
  return apiFetch<QuestionData[]>(
    `/courses/${courseId}/questions${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
    token
  );
}

export async function getQuestionById(token: string, questionId: string): Promise<QuestionData> {
  return apiFetch<QuestionData>(`/questions/${questionId}`, { method: 'GET' }, token);
}

export async function createQuestion(
  token: string,
  courseId: string,
  content: string,
  marks: number,
  type: string = 'SHORT_ANSWER',
  extra: { questionNumber?: string; officialAnswer?: string } = {}
): Promise<QuestionData> {
  return apiFetch<QuestionData>(
    `/courses/${courseId}/questions`,
    {
      method: 'POST',
      body: JSON.stringify({ courseId, content, marks, type, ...extra }),
    },
    token
  );
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
    officialAnswer?: string | null;
    syllabusTopicId?: string | null;
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
