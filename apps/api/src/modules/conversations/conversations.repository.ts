import { db, Conversation, ConversationMessage, MessageRole, MessageCitation } from '@exam-ai/database';
import { StructuredCitation } from '@exam-ai/rag';

export class ConversationsRepository {
  async createConversation(data: {
    userId: string;
    courseId: string;
    title: string;
  }): Promise<Conversation> {
    return db.conversation.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        title: data.title,
      },
    });
  }

  async findByCourseIdAndUserId(courseId: string, userId: string): Promise<Conversation[]> {
    return db.conversation.findMany({
      where: {
        courseId,
        userId,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });
  }

  async findByIdAndUserId(id: string, userId: string) {
    return db.conversation.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            citations: {
              include: {
                document: {
                  select: {
                    name: true,
                    originalFilename: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createMessage(data: {
    conversationId: string;
    role: MessageRole;
    content: string;
    metadata?: any;
  }): Promise<ConversationMessage> {
    return db.conversationMessage.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        metadata: data.metadata ?? undefined,
      },
    });
  }

  async saveCitations(messageId: string, citations: StructuredCitation[]): Promise<MessageCitation[]> {
    if (citations.length === 0) return [];

    const created: MessageCitation[] = [];
    for (const cit of citations) {
      const record = await db.messageCitation.create({
        data: {
          messageId,
          documentId: cit.documentId,
          pageId: cit.pageId,
          chunkId: cit.chunkId,
          pageNumber: cit.pageNumber,
          excerpt: cit.excerpt,
          relevanceScore: cit.relevanceScore,
        },
      });
      created.push(record);
    }
    return created;
  }

  async deleteConversation(id: string, userId: string): Promise<Conversation> {
    return db.conversation.delete({
      where: {
        id,
        userId,
      },
    });
  }
}
