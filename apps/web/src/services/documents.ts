import { apiFetch } from './api';

export type DocumentType = 'LECTURE' | 'PAST_QUESTION' | 'QUESTION_ANSWER' | 'SYLLABUS' | 'OTHER';
export type DocumentStatus =
  | 'UPLOADED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'INDEXING'
  | 'AWAITING_RANGE'
  | 'READY'
  | 'FAILED';

export interface DocumentDetails {
  id: string;
  courseId: string;
  userId: string;
  name: string;
  originalFilename: string;
  type: DocumentType;
  mimeType: string;
  storageKey: string;
  status: DocumentStatus;
  pageCount?: number | null;
  processingError?: string | null;
  contentStartPage?: number | null;
  contentEndPage?: number | null;
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
  course?: { id: string; name: string };
  _count?: {
    pages: number;
    chunks: number;
    questions: number;
    sections: number;
    syllabusTopics: number;
  };
}

export interface DocumentPageSummary {
  id: string;
  pageNumber: number;
  content?: string;
  wordCount: number;
  isEmpty: boolean;
  isExcluded: boolean;
  editedAt?: string | null;
  _count?: { chunks: number; questions: number };
}

export interface DocumentPageDetail extends DocumentPageSummary {
  content: string;
  questions?: Array<{
    id: string;
    questionNumber: string;
    content: string;
    officialAnswer?: string | null;
    officialAnswerSource?: 'NONE' | 'EXTRACTED' | 'CONTEXT' | 'AI' | 'MANUAL';
    options?: unknown;
    correctOption?: string | null;
    type: string;
    marks?: number | null;
  }>;
}

export interface PagesResponse {
  items: DocumentPageSummary[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export interface DocumentSection {
  id: string;
  documentId: string;
  courseId: string;
  title: string;
  pageStart: number;
  pageEnd: number;
  order: number;
  parentId?: string | null;
  _count?: { questions: number; chunks: number };
}

export async function uploadDocument(
  token: string,
  courseId: string,
  file: File,
  type: DocumentType,
  range?: { contentStartPage?: number; contentEndPage?: number }
): Promise<DocumentDetails> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  if (range?.contentStartPage) {
    formData.append('contentStartPage', String(range.contentStartPage));
  }
  if (range?.contentEndPage) {
    formData.append('contentEndPage', String(range.contentEndPage));
  }

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const response = await fetch(`${API_BASE_URL}/courses/${courseId}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const json = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message || 'Failed to upload document');
  }

  return json.data;
}

export async function getCourseDocuments(token: string, courseId: string): Promise<DocumentDetails[]> {
  return apiFetch<DocumentDetails[]>(`/courses/${courseId}/documents`, { method: 'GET' }, token);
}

export async function getDocumentById(token: string, documentId: string): Promise<DocumentDetails> {
  return apiFetch<DocumentDetails>(`/documents/${documentId}`, { method: 'GET' }, token);
}

export async function updateDocument(
  token: string,
  documentId: string,
  data: {
    name?: string;
    type?: DocumentType;
    contentStartPage?: number | null;
    contentEndPage?: number | null;
  }
): Promise<DocumentDetails> {
  return apiFetch<DocumentDetails>(
    `/documents/${documentId}`,
    { method: 'PATCH', body: JSON.stringify(data) },
    token
  );
}

export async function deleteDocument(token: string, documentId: string): Promise<void> {
  await apiFetch(`/documents/${documentId}`, { method: 'DELETE' }, token);
}

export async function reprocessDocument(
  token: string,
  documentId: string,
  data: {
    forceIndex?: boolean;
    contentStartPage?: number | null;
    contentEndPage?: number | null;
  } = {}
): Promise<DocumentDetails> {
  return apiFetch<DocumentDetails>(
    `/documents/${documentId}/reprocess`,
    { method: 'POST', body: JSON.stringify(data) },
    token
  );
}

export async function getDocumentPages(
  token: string,
  documentId: string,
  query: { page?: number; limit?: number; excluded?: boolean; search?: string; summary?: boolean } = {}
): Promise<PagesResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.excluded != null) params.set('excluded', String(query.excluded));
  if (query.search) params.set('search', query.search);
  if (query.summary) params.set('summary', 'true');
  const qs = params.toString();
  return apiFetch<PagesResponse>(`/documents/${documentId}/pages${qs ? `?${qs}` : ''}`, { method: 'GET' }, token);
}

export async function getDocumentPage(
  token: string,
  documentId: string,
  pageNumber: number
): Promise<DocumentPageDetail> {
  return apiFetch<DocumentPageDetail>(`/documents/${documentId}/pages/${pageNumber}`, { method: 'GET' }, token);
}

export async function updateDocumentPage(
  token: string,
  documentId: string,
  pageNumber: number,
  content: string
): Promise<DocumentPageDetail> {
  return apiFetch<DocumentPageDetail>(
    `/documents/${documentId}/pages/${pageNumber}`,
    { method: 'PATCH', body: JSON.stringify({ content }) },
    token
  );
}

export async function reindexDocumentPage(
  token: string,
  documentId: string,
  pageNumber: number
): Promise<{ chunks: number }> {
  return apiFetch<{ chunks: number }>(
    `/documents/${documentId}/pages/${pageNumber}/reindex`,
    { method: 'POST' },
    token
  );
}

export async function getDocumentSections(token: string, documentId: string): Promise<DocumentSection[]> {
  return apiFetch<DocumentSection[]>(`/documents/${documentId}/sections`, { method: 'GET' }, token);
}

export async function createDocumentSection(
  token: string,
  documentId: string,
  data: { title: string; pageStart: number; pageEnd: number; order?: number }
): Promise<DocumentSection> {
  return apiFetch<DocumentSection>(
    `/documents/${documentId}/sections`,
    { method: 'POST', body: JSON.stringify(data) },
    token
  );
}

export async function updateDocumentSection(
  token: string,
  sectionId: string,
  data: { title: string; pageStart: number; pageEnd: number; order?: number }
): Promise<DocumentSection> {
  return apiFetch<DocumentSection>(
    `/sections/${sectionId}`,
    { method: 'PATCH', body: JSON.stringify(data) },
    token
  );
}

export async function deleteDocumentSection(token: string, sectionId: string): Promise<void> {
  await apiFetch(`/sections/${sectionId}`, { method: 'DELETE' }, token);
}
