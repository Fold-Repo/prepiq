import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { QueueName, ProcessDocumentPayload } from '@exam-ai/shared';

export class QueueService {
  private documentQueue: Queue<ProcessDocumentPayload> | null = null;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
      this.documentQueue = new Queue<ProcessDocumentPayload>(QueueName.DOCUMENT_PROCESSING, {
        connection,
      });
    } catch (err) {
      console.warn('BullMQ Redis connection initialization skipped or failed:', err);
    }
  }

  getDocumentQueue(): Queue<ProcessDocumentPayload> | null {
    return this.documentQueue;
  }

  async enqueueDocumentProcessing(payload: ProcessDocumentPayload): Promise<void> {
    if (!this.documentQueue) {
      console.warn(`[QueueService] Redis queue offline. Job for document ${payload.documentId} skipped.`);
      return;
    }

    await this.documentQueue.add(
      `process-doc-${payload.documentId}`,
      payload,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      }
    );

    console.log(`[QueueService] Dispatched PROCESS_DOCUMENT job for document ${payload.documentId}`);
  }
}
