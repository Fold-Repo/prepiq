import { db } from '@exam-ai/database';
import { generateStudyRecommendations } from '@exam-ai/ai';

export class AnalyticsService {
  async getCourseAnalytics(courseId: string, userId: string) {
    // 1. Fetch all completed quiz attempts for the course
    const attempts = await db.quizAttempt.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        quiz: {
          courseId,
        }
      },
      include: {
        answers: {
          include: {
            question: true,
          }
        }
      }
    });

    if (attempts.length === 0) {
      return {
        topicPerformance: [],
        weakTopics: [],
        strongTopics: [],
        readinessScore: 0,
        recommendations: [],
      };
    }

    // 2. Aggregate data by topic
    const topicStats: Record<string, { scoreAwarded: number; maxScore: number }> = {};

    attempts.forEach(attempt => {
      attempt.answers.forEach(answer => {
        const topic = answer.question.topic || 'General';
        if (!topicStats[topic]) {
          topicStats[topic] = { scoreAwarded: 0, maxScore: 0 };
        }
        topicStats[topic].scoreAwarded += (answer.scoreAwarded || 0);
        topicStats[topic].maxScore += answer.question.marks;
      });
    });

    const topicPerformance = Object.entries(topicStats).map(([topic, stats]) => {
      const accuracy = stats.maxScore > 0 ? (stats.scoreAwarded / stats.maxScore) * 100 : 0;
      return {
        topic,
        accuracy: Math.round(accuracy),
        scoreAwarded: stats.scoreAwarded,
        maxScore: stats.maxScore,
      };
    });

    // 3. Identify strong and weak topics
    const weakTopics = topicPerformance.filter(t => t.accuracy < 60);
    const strongTopics = topicPerformance.filter(t => t.accuracy >= 80);

    // 4. Generate AI recommendations
    let readinessScore = 0;
    let recommendations: string[] = [];

    if (topicPerformance.length > 0) {
      const performanceString = topicPerformance.map(t => `${t.topic}: ${t.accuracy}% (${t.scoreAwarded}/${t.maxScore} marks)`).join('\n');
      try {
        const aiAnalysis = await generateStudyRecommendations(performanceString);
        const score = Number(aiAnalysis?.readinessScore);
        readinessScore = Number.isFinite(score)
          ? Math.max(0, Math.min(100, Math.round(score)))
          : Math.round(topicPerformance.reduce((acc, t) => acc + t.accuracy, 0) / topicPerformance.length);
        recommendations = Array.isArray(aiAnalysis?.recommendations)
          ? aiAnalysis.recommendations.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : [];
        if (recommendations.length === 0) {
          recommendations = ['Continue practicing your weak topics to improve your score.'];
        }
      } catch (err) {
        console.error('Failed to generate AI recommendations:', err);
        readinessScore = Math.round(topicPerformance.reduce((acc, t) => acc + t.accuracy, 0) / topicPerformance.length);
        recommendations = ['Continue practicing your weak topics to improve your score.'];
      }
    }

    return {
      topicPerformance,
      weakTopics,
      strongTopics,
      readinessScore,
      recommendations,
    };
  }
}
