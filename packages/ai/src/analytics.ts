import { AIProvider, getAIProvider } from './index';

export interface StudyRecommendationsResult {
  readinessScore: number;
  recommendations: string[];
}

export async function generateStudyRecommendations(
  performanceData: string
): Promise<StudyRecommendationsResult> {
  const provider = getAIProvider();

  const systemPrompt = `You are an expert academic tutor analyzing a student's performance data across various topics.
  
You will be provided with aggregated performance data (e.g., accuracy percentages, marks).
Your task is to:
1. Calculate a "Readiness Score" out of 100 based on the student's overall performance.
2. Generate a list of exactly 3-5 concise, actionable study recommendations to help them improve, focusing particularly on their weak topics.`;

  const userPrompt = `Student Performance Data:\n\n${performanceData}`;

  const result = await provider.generateStructured<StudyRecommendationsResult>({
    systemPrompt,
    userPrompt,
  });

  return {
    readinessScore: Number.isFinite(Number(result?.readinessScore))
      ? Math.max(0, Math.min(100, Math.round(Number(result.readinessScore))))
      : 0,
    recommendations: Array.isArray(result?.recommendations)
      ? result.recommendations.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
  };
}
