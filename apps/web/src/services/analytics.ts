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
  const payload = await res.json();
  const data = payload?.data ?? payload ?? {};
  return {
    topicPerformance: Array.isArray(data.topicPerformance) ? data.topicPerformance : [],
    weakTopics: Array.isArray(data.weakTopics) ? data.weakTopics : [],
    strongTopics: Array.isArray(data.strongTopics) ? data.strongTopics : [],
    readinessScore: Number.isFinite(Number(data.readinessScore)) ? Number(data.readinessScore) : 0,
    recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
  };
}
