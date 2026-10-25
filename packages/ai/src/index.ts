import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface TextGenerationOptions {
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StructuredOutputOptions<T> {
  systemPrompt?: string;
  userPrompt: string;
  schema?: unknown;
}

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export interface AIProvider {
  generateText(options: TextGenerationOptions): Promise<string>;
  generateStructured<T>(options: StructuredOutputOptions<T>): Promise<T>;
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]>;
}

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private embeddingModel: string;
  private completionModel: string;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    this.embeddingModel = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    this.completionModel = process.env.COMPLETION_MODEL || 'gpt-4o';
  }

  async generateText(options: TextGenerationOptions): Promise<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: options.userPrompt });

    const response = await this.client.chat.completions.create({
      model: this.completionModel,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1500,
    });

    return response.choices[0]?.message?.content || '';
  }

  async generateStructured<T>(options: StructuredOutputOptions<T>): Promise<T> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: `${options.systemPrompt}\n\nIMPORTANT: Return valid JSON adhering strictly to the requested schema.`,
      });
    }

    messages.push({ role: 'user', content: options.userPrompt });

    const response = await this.client.chat.completions.create({
      model: this.completionModel,
      messages,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content) as T;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text.replace(/\n/g, ' '),
    });

    const item = response.data[0];
    return {
      embedding: item.embedding,
      tokenCount: response.usage?.total_tokens || Math.ceil(text.length / 4),
    };
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) return [];

    const formattedInputs = texts.map((t) => t.replace(/\n/g, ' '));
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: formattedInputs,
    });

    return response.data.map((item) => ({
      embedding: item.embedding,
      tokenCount: Math.ceil(texts[item.index]?.length / 4),
    }));
  }
}

export class MockAIProvider implements AIProvider {
  async generateText(options: TextGenerationOptions): Promise<string> {
    return `[Mock Response to: "${options.userPrompt.substring(0, 60)}..."]`;
  }

  async generateStructured<T>(_options: StructuredOutputOptions<T>): Promise<T> {
    return {} as T;
  }

  async generateEmbedding(_text: string): Promise<EmbeddingResult> {
    return {
      embedding: new Array(1536).fill(0.01),
      tokenCount: 10,
    };
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    return texts.map(() => ({
      embedding: new Array(1536).fill(0.01),
      tokenCount: 10,
    }));
  }
}

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private openAiFallback: OpenAIProvider;
  private completionModel: string;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.openAiFallback = new OpenAIProvider();
    this.completionModel = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20240620';
  }

  async generateText(options: TextGenerationOptions): Promise<string> {
    const messages: Anthropic.MessageParam[] = [];
    messages.push({ role: 'user', content: options.userPrompt });

    const response = await this.client.messages.create({
      model: this.completionModel,
      max_tokens: options.maxTokens ?? 1500,
      temperature: options.temperature ?? 0.2,
      system: options.systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    return '';
  }

  async generateStructured<T>(options: StructuredOutputOptions<T>): Promise<T> {
    const messages: Anthropic.MessageParam[] = [];
    messages.push({ role: 'user', content: options.userPrompt });
    
    const system = `${options.systemPrompt || ''}\n\nIMPORTANT: Return ONLY valid JSON adhering strictly to the requested schema. No surrounding text or markdown blocks.`;

    const response = await this.client.messages.create({
      model: this.completionModel,
      max_tokens: 2500,
      temperature: 0.1,
      system,
      messages,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const match = content.text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      const jsonStr = match ? match[0] : content.text;
      return JSON.parse(jsonStr) as T;
    }
    throw new Error('Failed to generate structured JSON from Anthropic');
  }

  // Anthropic does not have an embeddings API, fallback to OpenAI
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    return this.openAiFallback.generateEmbedding(text);
  }

  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    return this.openAiFallback.generateEmbeddings(texts);
  }
}

export function getAIProvider(providerType?: string): AIProvider {
  if (providerType === 'ANTHROPIC' && process.env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider();
  }
  
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
    return new OpenAIProvider();
  }
  
  return new MockAIProvider();
}
export * from './quiz';
export * from './analytics';
export * from './extract';
