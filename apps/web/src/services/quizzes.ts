export interface QuizQuestion {
  id: string;
  quizId: string;
  content: string;
  type: 'MCQ' | 'SHORT_ANSWER';
  options?: any;
  marks: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  score?: number;
  maxScore?: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: string;
  completedAt?: string;
  lastSavedAt?: string;
  autosaveData?: any;
}

export interface Quiz {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  description?: string;
  isMockExam?: boolean;
  timeLimitMinutes?: number;
  createdAt: string;
  questions?: QuizQuestion[];
  attempts?: QuizAttempt[];
  _count?: {
    questions: number;
    attempts: number;
  };
}

export async function getCourseQuizzes(token: string, courseId: string): Promise<Quiz[]> {
  const res = await fetch(`http://localhost:4000/api/v1/courses/${courseId}/quizzes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch quizzes');
  const data = await res.json();
  return data.data;
}

export async function generateQuiz(
  token: string, 
  courseId: string, 
  topic?: string, 
  questionCount = 5,
  isMockExam = false,
  timeLimitMinutes?: number
): Promise<Quiz> {
  const res = await fetch(`http://localhost:4000/api/v1/courses/${courseId}/quizzes/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, questionCount, isMockExam, timeLimitMinutes }),
  });
  if (!res.ok) throw new Error('Failed to generate quiz');
  const data = await res.json();
  return data.data;
}

export async function getQuizById(token: string, courseId: string, quizId: string): Promise<Quiz> {
  const res = await fetch(`http://localhost:4000/api/v1/courses/${courseId}/quizzes/${quizId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch quiz');
  const data = await res.json();
  return data.data;
}

export async function startQuizAttempt(token: string, courseId: string, quizId: string): Promise<QuizAttempt> {
  const res = await fetch(`http://localhost:4000/api/v1/courses/${courseId}/quizzes/${quizId}/attempts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to start attempt');
  const data = await res.json();
  return data.data;
}

export async function submitQuizAttempt(
  token: string,
  courseId: string,
  quizId: string,
  attemptId: string,
  answers: { questionId: string; providedAnswer: string }[]
): Promise<QuizAttempt> {
  const res = await fetch(`http://localhost:4000/api/v1/courses/${courseId}/quizzes/${quizId}/attempts/${attemptId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error('Failed to submit attempt');
  const data = await res.json();
  return data.data;
}

export async function autosaveQuizAttempt(
  token: string,
  courseId: string,
  quizId: string,
  attemptId: string,
  answers: { questionId: string; providedAnswer: string }[]
): Promise<QuizAttempt> {
  const res = await fetch(`http://localhost:4000/api/v1/courses/${courseId}/quizzes/${quizId}/attempts/${attemptId}/autosave`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error('Failed to autosave attempt');
  const data = await res.json();
  return data.data;
}
