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

  return provider.generateStructured<StudyRecommendationsResult>({
    systemPrompt,
    userPrompt,
  });
}
