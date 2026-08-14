import { apiFetch } from './api';

export interface MessageCitationData {
  id: string;
  documentId: string;
  pageId: string;
  chunkId: string;
  pageNumber: number;
  excerpt: string;
  relevanceScore: number;
  document?: {
    name: string;
    originalFilename: string;
  };
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata?: any;
  createdAt: string;
  citations?: MessageCitationData[];
}

export interface ConversationThread {
  id: string;
  userId: string;
  courseId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
  _count?: {
    messages: number;
  };
}

export interface ChatResponseData {
  conversationId: string;
  message: ChatMessage;
  citations: MessageCitationData[];
}

export async function createConversation(
  token: string,
  courseId: string,
  title?: string
): Promise<ConversationThread> {
  return apiFetch<ConversationThread>(
    `/courses/${courseId}/conversations`,
    {
      method: 'POST',
      body: JSON.stringify({ title }),
    },
    token
  );
}

export async function getCourseConversations(
  token: string,
  courseId: string
): Promise<ConversationThread[]> {
  return apiFetch<ConversationThread[]>(`/courses/${courseId}/conversations`, { method: 'GET' }, token);
}

export async function getConversationById(
  token: string,
  conversationId: string
): Promise<ConversationThread> {
  return apiFetch<ConversationThread>(`/conversations/${conversationId}`, { method: 'GET' }, token);
}

export async function sendChatMessage(
  token: string,
  courseId: string,
  message: string,
  conversationId?: string
): Promise<ChatResponseData> {
  return apiFetch<ChatResponseData>(
    `/courses/${courseId}/chat`,
    {
      method: 'POST',
      body: JSON.stringify({
        conversationId,
        message,
      }),
    },
    token
  );
}

export async function deleteConversation(token: string, conversationId: string): Promise<void> {
  await apiFetch(`/conversations/${conversationId}`, { method: 'DELETE' }, token);
}
