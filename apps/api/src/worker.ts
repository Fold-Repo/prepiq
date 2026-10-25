import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { QueueName, ProcessDocumentPayload } from '@exam-ai/shared';
import { db, DocumentStatus } from '@exam-ai/database';
import { processDocument } from './services/document-processor.service';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6382';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

console.log('[Worker] Starting BullMQ Worker for Queue:', QueueName.DOCUMENT_PROCESSING);
console.log('[Worker] Connecting to Redis at:', redisUrl);

const worker = new Worker<ProcessDocumentPayload>(
  QueueName.DOCUMENT_PROCESSING,
  async (job: Job<ProcessDocumentPayload>) => {
    const { documentId, courseId, storageKey, forceIndex } = job.data;
    console.log(`[Worker] Processing document ${documentId}`);

    try {
      const result = await processDocument({
        documentId,
        courseId,
        storageKey,
        forceIndex,
      });
      console.log(
        `[Worker] Document ${documentId} finished with status ${result.status} (${result.pageCount} pages, ${result.chunks} chunks).`
      );
      return result;
    } catch (error: any) {
      console.error(`[Worker] Failed to process document ${documentId}:`, error);
      await db.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.FAILED, processingError: error.message || 'Unknown error' },
      });
      throw error;
    }
  },
  { connection }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});
