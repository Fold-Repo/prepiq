import { apiFetch } from './api';
import { CreateCourseInput, UpdateCourseInput } from '@exam-ai/validation';

export interface CourseDocument {
  id: string;
  name: string;
  originalFilename: string;
  type: 'LECTURE' | 'PAST_QUESTION' | 'QUESTION_ANSWER' | 'OTHER';
  status: 'UPLOADED' | 'QUEUED' | 'PROCESSING' | 'INDEXING' | 'READY' | 'FAILED';
  pageCount?: number | null;
  createdAt: string;
}

export interface Course {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  academicYear?: string | null;
  createdAt: string;
  updatedAt: string;
  documents?: CourseDocument[];
  _count?: {
    documents: number;
    questions: number;
    conversations?: number;
  };
}

export async function createCourse(token: string, input: CreateCourseInput): Promise<Course> {
  return apiFetch<Course>(
    '/courses',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token
  );
}

export async function getCourses(token: string): Promise<Course[]> {
  return apiFetch<Course[]>('/courses', { method: 'GET' }, token);
}

export async function getCourseById(token: string, courseId: string): Promise<Course> {
  return apiFetch<Course>(`/courses/${courseId}`, { method: 'GET' }, token);
}

export async function updateCourse(
  token: string,
  courseId: string,
  input: UpdateCourseInput
): Promise<Course> {
  return apiFetch<Course>(
    `/courses/${courseId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    token
  );
}

export async function deleteCourse(token: string, courseId: string): Promise<void> {
  await apiFetch(`/courses/${courseId}`, { method: 'DELETE' }, token);
}
