export interface TopicPerformance {
  topic: string;
  accuracy: number;
  scoreAwarded: number;
  maxScore: number;
}

export interface CourseAnalytics {
  topicPerformance: TopicPerformance[];
  weakTopics: TopicPerformance[];
  strongTopics: TopicPerformance[];
  readinessScore: number;
  recommendations: string[];
}

export async function getCourseAnalytics(token: string, courseId: string): Promise<CourseAnalytics> {
  const res = await fetch(`http://localhost:4000/api/v1/courses/${courseId}/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  const data = await res.json();
  return data.data;
}
