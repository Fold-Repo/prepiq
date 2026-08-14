import { apiFetch } from './api';

export type DocumentType = 'LECTURE' | 'PAST_QUESTION' | 'QUESTION_ANSWER' | 'OTHER';
export type DocumentStatus = 'UPLOADED' | 'QUEUED' | 'PROCESSING' | 'INDEXING' | 'READY' | 'FAILED';

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
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    pages: number;
    chunks: number;
    questions: number;
  };
}

export async function uploadDocument(
  token: string,
  courseId: string,
  file: File,
  type: DocumentType
): Promise<DocumentDetails> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

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

export async function deleteDocument(token: string, documentId: string): Promise<void> {
  await apiFetch(`/documents/${documentId}`, { method: 'DELETE' }, token);
}

export async function reprocessDocument(token: string, documentId: string): Promise<DocumentDetails> {
  return apiFetch<DocumentDetails>(`/documents/${documentId}/reprocess`, { method: 'POST' }, token);
}
