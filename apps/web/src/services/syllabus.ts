import { apiFetch } from './api';

export interface SyllabusTopic {
  id: string;
  courseId: string;
  documentId?: string | null;
  parentId?: string | null;
  title: string;
  description?: string | null;
  order: number;
  weekNumber?: number | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  createdAt: string;
  document?: { id: string; name: string; type: string } | null;
  children?: SyllabusTopic[];
  _count?: { questions: number };
}

export async function getCourseSyllabus(token: string, courseId: string): Promise<SyllabusTopic[]> {
  return apiFetch<SyllabusTopic[]>(`/courses/${courseId}/syllabus`, { method: 'GET' }, token);
}

export async function createSyllabusTopic(
  token: string,
  courseId: string,
  data: {
    title: string;
    description?: string;
    weekNumber?: number | null;
    parentId?: string | null;
    order?: number;
  }
): Promise<SyllabusTopic> {
  return apiFetch<SyllabusTopic>(
    `/courses/${courseId}/syllabus`,
    { method: 'POST', body: JSON.stringify(data) },
    token
  );
}

export async function updateSyllabusTopic(
  token: string,
  topicId: string,
  data: {
    title: string;
    description?: string | null;
    weekNumber?: number | null;
    pageStart?: number | null;
    pageEnd?: number | null;
    order?: number;
    parentId?: string | null;
  }
): Promise<SyllabusTopic> {
  return apiFetch<SyllabusTopic>(
    `/syllabus/${topicId}`,
    { method: 'PATCH', body: JSON.stringify(data) },
    token
  );
}

export async function deleteSyllabusTopic(token: string, topicId: string): Promise<void> {
  await apiFetch(`/syllabus/${topicId}`, { method: 'DELETE' }, token);
}

export async function extractSyllabusFromDocument(token: string, documentId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(
    `/documents/${documentId}/extract-syllabus`,
    { method: 'POST' },
    token
  );
}
