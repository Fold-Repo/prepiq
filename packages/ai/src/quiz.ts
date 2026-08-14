import { AIProvider, getAIProvider } from './index';

export interface GeneratedQuizQuestion {
  content: string;
  type: 'MCQ' | 'SHORT_ANSWER';
  options?: string[]; // for MCQ
  correctOption?: string; // for MCQ
  explanation?: string;
  topic: string;
  marks?: number;
}

export interface GeneratedQuiz {
  title: string;
  description: string;
  questions: GeneratedQuizQuestion[];
}

export interface QuizGenerationOptions {
  courseContext: string;
  topic?: string;
  questionCount?: number;
  aiProvider?: string;
}

export async function generateQuiz(options: QuizGenerationOptions): Promise<GeneratedQuiz> {
  const provider = getAIProvider(options.aiProvider);
  
  const count = options.questionCount || 5;
  const topicFocus = options.topic ? `Focus specifically on the topic: ${options.topic}.` : 'Cover the provided course material broadly.';
  
  const systemPrompt = `You are an expert educator. Your task is to generate a quiz based on the provided course material.
  
${topicFocus}

Generate exactly ${count} questions. Include a mix of multiple-choice questions (MCQ) and short answer questions (SHORT_ANSWER).
For MCQs, provide 4 options and clearly indicate the correct option (which MUST exactly match one of the options).
For SHORT_ANSWER questions, do not provide options.
Provide a brief explanation for the answer to each question.
Categorize EVERY question with a specific sub-topic (e.g., "Mitochondria", "Newton's Second Law"). This goes in the \`topic\` field.`;

  const userPrompt = `Course Material:\n\n${options.courseContext}`;

  // Since we don't have a rigid runtime JSON schema validator strictly enforced by OpenAI API in older versions, 
  // we rely on the prompt instructing it. Or we can just use generateStructured if we pass schema.
  
  return provider.generateStructured<GeneratedQuiz>({
    systemPrompt,
    userPrompt,
  });
}

export interface ShortAnswerGradingResult {
  score: number;
  maxScore: number;
  feedback: string;
}

export async function gradeShortAnswer(question: string, studentAnswer: string, context: string, maxScore: number = 5, aiProvider: string = 'OPENAI'): Promise<ShortAnswerGradingResult> {
  const provider = getAIProvider(aiProvider);

  const systemPrompt = `You are an expert examiner grading a student's short answer.
  
You will be provided with:
1. The Question
2. Relevant Course Material (Context)
3. The Student's Answer

Your task is to grade the student's answer out of a maximum score of ${maxScore}.
Provide constructive feedback explaining what the student got right and what was missing or incorrect based on the context.`;

  const userPrompt = `Question: ${question}\n\nContext: ${context}\n\nStudent Answer: ${studentAnswer}`;

  return provider.generateStructured<ShortAnswerGradingResult>({
    systemPrompt,
    userPrompt,
  });
}
