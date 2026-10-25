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
For MCQs, provide 4 options and the correctOption MUST exactly match one of the options strings.
For SHORT_ANSWER questions, set options to an empty array [] and omit correctOption.
Provide a brief explanation for each answer. Categorize EVERY question with a specific sub-topic in the \`topic\` field.

You MUST return valid JSON matching this exact schema:
{
  "title": "string",
  "description": "string",
  "questions": [
    {
      "content": "The full question text goes here",
      "type": "MCQ" | "SHORT_ANSWER",
      "options": ["option A", "option B", "option C", "option D"],
      "correctOption": "option B",
      "explanation": "string",
      "topic": "string",
      "marks": 1
    }
  ]
}

IMPORTANT: Use exactly the field name "content" for the question text, NOT "question" or "questionText".`;

  const userPrompt = `Course Material:\n\n${options.courseContext}`;

  const raw = await provider.generateStructured<any>({
    systemPrompt,
    userPrompt,
  });

  // Normalize field names in case the model used alternatives
  const questions: GeneratedQuizQuestion[] = (raw.questions || []).map((q: any) => ({
    content: q.content ?? q.question ?? q.questionText ?? q.text ?? '',
    type: q.type as 'MCQ' | 'SHORT_ANSWER',
    options: q.options || [],
    correctOption: q.correctOption ?? q.correct ?? q.answer ?? undefined,
    explanation: q.explanation ?? q.rationale ?? '',
    topic: q.topic ?? q.category ?? 'General',
    marks: q.marks ?? q.points ?? 1,
  }));

  return {
    title: raw.title || 'Generated Quiz',
    description: raw.description || '',
    questions,
  };
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
