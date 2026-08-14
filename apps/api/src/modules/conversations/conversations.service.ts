import { ConversationsRepository } from './conversations.repository';
import { executeRAGQuery } from '@exam-ai/rag';
import { MessageRole } from '@exam-ai/database';
import { CoursesService } from '../courses/courses.service';

export class ConversationsService {
  private repository: ConversationsRepository;
  private coursesService: CoursesService;

  constructor() {
    this.repository = new ConversationsRepository();
    this.coursesService = new CoursesService();
  }

  async createConversation(userId: string, courseId: string, title?: string) {
    await this.coursesService.getCourseDetails(courseId, userId);
    return this.repository.createConversation({
      userId,
      courseId,
      title: title || 'Course Chat',
    });
  }

  async getCourseConversations(userId: string, courseId: string) {
    await this.coursesService.getCourseDetails(courseId, userId);
    return this.repository.findByCourseIdAndUserId(courseId, userId);
  }

  async getConversationMessages(userId: string, conversationId: string) {
    const conv = await this.repository.findByIdAndUserId(conversationId, userId);
    if (!conv) {
      const error: any = new Error('Conversation not found');
      error.statusCode = 404;
      error.code = 'CONVERSATION_NOT_FOUND';
      throw error;
    }
    return conv;
  }

  async processChatMessage(input: {
    userId: string;
    courseId: string;
    conversationId?: string;
    message: string;
  }) {
    // 1. Verify course ownership
    await this.coursesService.getCourseDetails(input.courseId, input.userId);

    // 2. Ensure conversation thread exists
    let conversationId = input.conversationId;
    if (!conversationId) {
      const title = input.message.length > 35 ? input.message.substring(0, 35) + '...' : input.message;
      const conv = await this.repository.createConversation({
        userId: input.userId,
        courseId: input.courseId,
        title,
      });
      conversationId = conv.id;
    } else {
      await this.getConversationMessages(input.userId, conversationId);
    }

    // 3. Save User message
    await this.repository.createMessage({
      conversationId,
      role: MessageRole.USER,
      content: input.message,
    });

    // 4. Run RAG Pipeline Query
    const ragResult = await executeRAGQuery({
      userId: input.userId,
      courseId: input.courseId,
      query: input.message,
      maxChunks: 5,
    });

    // 5. Save Assistant message
    const assistantMessage = await this.repository.createMessage({
      conversationId,
      role: MessageRole.ASSISTANT,
      content: ragResult.answerText,
      metadata: {
        retrievedChunksCount: ragResult.retrievedChunksCount,
        hasSufficientContext: ragResult.hasSufficientContext,
      },
    });

    // 6. Save DB citations
    const savedCitations = await this.repository.saveCitations(assistantMessage.id, ragResult.citations);

    return {
      conversationId,
      message: assistantMessage,
      citations: savedCitations.map((c) => ({
        id: c.id,
        documentId: c.documentId,
        pageId: c.pageId,
        chunkId: c.chunkId,
        pageNumber: c.pageNumber,
        excerpt: c.excerpt,
        relevanceScore: c.relevanceScore,
      })),
    };
  }

  async deleteConversation(userId: string, conversationId: string) {
    await this.getConversationMessages(userId, conversationId);
    return this.repository.deleteConversation(conversationId, userId);
  }
}
