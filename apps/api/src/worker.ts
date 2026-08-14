import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { QueueName, ProcessDocumentPayload } from '@exam-ai/shared';
import { StorageService } from './services/storage.service';
import { getAIProvider } from '@exam-ai/ai';
import { extractPagesFromPDFBuffer, chunkPageContent } from '@exam-ai/pdf';
import { db, DocumentStatus } from '@exam-ai/database';
import { randomUUID } from 'crypto';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const storageService = new StorageService();

console.log('[Worker] Starting BullMQ Worker for Queue:', QueueName.DOCUMENT_PROCESSING);

const worker = new Worker<ProcessDocumentPayload>(
  QueueName.DOCUMENT_PROCESSING,
  async (job: Job<ProcessDocumentPayload>) => {
    const { documentId, courseId, userId, storageKey } = job.data;
    console.log(`[Worker] Processing document ${documentId}`);

    try {
      // 1. Update status to PROCESSING
      await db.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.PROCESSING },
      });

      // 2. Fetch the file buffer
      console.log(`[Worker] Downloading file ${storageKey} from storage...`);
      const pdfBuffer = await storageService.downloadFile(storageKey);

      // 3. Extract text pages
      console.log(`[Worker] Parsing PDF...`);
      const extracted = await extractPagesFromPDFBuffer(pdfBuffer);

      // 4. Chunk & generate embeddings
      const aiProvider = getAIProvider();
      let totalChunks = 0;

      for (const page of extracted.pages) {
        const chunks = chunkPageContent(page.pageNumber, page.content, { targetTokens: 600 });
        
        for (const chunk of chunks) {
          console.log(`[Worker] Embedding chunk for page ${page.pageNumber}...`);
          const { embedding } = await aiProvider.generateEmbedding(chunk.content);
          
          const vectorStr = `[${embedding.join(',')}]`;

          // Bulk insert chunks directly using raw query to support pgvector array
          await db.$executeRawUnsafe(`
            INSERT INTO document_chunks (
              id, document_id, course_id, page_id, page_number, section_title, content, token_count, embedding
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9::vector
            )
          `,
            randomUUID(),
            documentId,
            courseId,
            `page_${page.pageNumber}`,
            chunk.pageNumber,
            chunk.sectionTitle || null,
            chunk.content,
            chunk.tokenCount,
            vectorStr
          );
          
          totalChunks++;
        }
      }

      // 5. Update status to READY
      await db.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.READY },
      });

      console.log(`[Worker] Document ${documentId} processed successfully into ${totalChunks} chunks.`);
    } catch (error: any) {
      console.error(`[Worker] Failed to process document ${documentId}:`, error);
      // Mark as failed
      await db.document.update({
        where: { id: documentId },
        data: { status: DocumentStatus.FAILED, processingError: error.message || 'Unknown error' },
      });
      throw error;
    }
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err);
});
