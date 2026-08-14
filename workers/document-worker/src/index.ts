import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { QueueName, ProcessDocumentPayload } from '@exam-ai/shared';
import { db, DocumentStatus, DocumentType, QuestionType } from '@exam-ai/database';
import { extractPagesFromPDFBuffer, chunkPageContent } from '@exam-ai/pdf';
import { getAIProvider } from '@exam-ai/ai';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const readFileAsync = promisify(fs.readFile);

export async function getPDFBuffer(storageKey: string): Promise<Buffer> {
  const localStorageDir = path.join(process.cwd(), '../../apps/api/uploads');
  const localFilePath = path.join(localStorageDir, storageKey.replace(/\//g, '_'));

  if (fs.existsSync(localFilePath)) {
    return readFileAsync(localFilePath);
  }

  const rootUploadPath = path.join(process.cwd(), 'uploads', storageKey.replace(/\//g, '_'));
  if (fs.existsSync(rootUploadPath)) {
    return readFileAsync(rootUploadPath);
  }

  throw new Error(`File buffer not found for key: ${storageKey}`);
}

export async function processDocumentJob(job: Job<ProcessDocumentPayload>) {
  const { documentId, courseId, storageKey } = job.data;
  console.log(`[Worker] Starting document processing for docId: ${documentId}`);

  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document) {
    throw new Error(`Document with ID ${documentId} not found`);
  }

  try {
    // 1. Mark status as PROCESSING
    await db.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.PROCESSING, processingError: null },
    });

    // 2. Retrieve PDF buffer
    const pdfBuffer = await getPDFBuffer(storageKey);

    // 3. Idempotent cleanup: delete existing questions, chunks, and pages for this document
    await db.question.deleteMany({ where: { documentId } });
    await db.documentChunk.deleteMany({ where: { documentId } });
    await db.documentPage.deleteMany({ where: { documentId } });

    // 4. Extract pages page-by-page preserving order
    const extracted = await extractPagesFromPDFBuffer(pdfBuffer);
    console.log(`[Worker] Extracted ${extracted.pageCount} pages from PDF for docId: ${documentId}`);

    const createdChunkIds: { id: string; content: string }[] = [];

    // 5. Store DocumentPage records & generate DocumentChunk records
    for (const pageData of extracted.pages) {
      const pageRecord = await db.documentPage.create({
        data: {
          documentId,
          pageNumber: pageData.pageNumber,
          content: pageData.content,
        },
      });

      const chunkResults = chunkPageContent(pageData.pageNumber, pageData.content, {
        targetTokens: 600,
        overlapTokens: 100,
      });

      for (const chunk of chunkResults) {
        const createdChunk = await db.documentChunk.create({
          data: {
            documentId,
            pageId: pageRecord.id,
            courseId,
            pageNumber: chunk.pageNumber,
            sectionTitle: chunk.sectionTitle,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
          },
        });

        createdChunkIds.push({ id: createdChunk.id, content: chunk.content });
      }
    }

    // 6. If PAST_QUESTION document type, perform AI structured question extraction
    if (document.type === DocumentType.PAST_QUESTION) {
      console.log(`[Worker] Running AI Question Extraction for Past Paper docId: ${documentId}...`);
      const aiProvider = getAIProvider();
      const combinedText = extracted.pages.map((p) => `--- PAGE ${p.pageNumber} ---\n${p.content}`).join('\n\n');

      const systemPrompt =
        `You are an expert exam paper parser. Extract all individual examination questions from the provided past paper text.\n` +
        `Return a JSON object containing a "questions" array.\n` +
        `Each item must contain:\n` +
        `- "questionNumber": e.g. "1(a)", "Question 2", "3.1"\n` +
        `- "content": full text of the question\n` +
        `- "marks": assigned marks as integer if available, or null\n` +
        `- "type": one of "MCQ", "SHORT_ANSWER", "ESSAY", "CALCULATION", "TRUE_FALSE", "OTHER"`;

      try {
        const extractedQuestionsResult = await aiProvider.generateStructured<{
          questions: Array<{
            questionNumber: string;
            content: string;
            marks?: number | null;
            type?: string;
          }>;
        }>({
          systemPrompt,
          userPrompt: combinedText,
        });

        if (extractedQuestionsResult.questions && Array.isArray(extractedQuestionsResult.questions)) {
          for (const q of extractedQuestionsResult.questions) {
            let qType: QuestionType = QuestionType.SHORT_ANSWER;
            if (q.type && Object.values(QuestionType).includes(q.type as any)) {
              qType = q.type as QuestionType;
            }

            await db.question.create({
              data: {
                courseId,
                documentId,
                questionNumber: q.questionNumber || 'Q',
                content: q.content,
                marks: q.marks ? Math.round(q.marks) : null,
                type: qType,
              },
            });
          }
          console.log(`[Worker] Extracted ${extractedQuestionsResult.questions.length} questions from past paper.`);
        }
      } catch (err) {
        console.warn(`[Worker] AI question extraction encountered a warning for docId ${documentId}:`, err);
      }
    }

    // 7. Transition to INDEXING phase for vector embedding generation
    await db.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.INDEXING },
    });
    console.log(`[Worker] Generating vector embeddings for ${createdChunkIds.length} chunks...`);

    // 8. Batch generate embeddings using AI Provider
    const aiProvider = getAIProvider();
    const BATCH_SIZE = 20;

    for (let i = 0; i < createdChunkIds.length; i += BATCH_SIZE) {
      const batch = createdChunkIds.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.content);

      const embeddingResults = await aiProvider.generateEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const chunkItem = batch[j];
        const embResult = embeddingResults[j];

        if (embResult && embResult.embedding) {
          const vectorStr = `[${embResult.embedding.join(',')}]`;
          await db.$executeRaw`
            UPDATE document_chunks
            SET embedding = ${vectorStr}::vector,
                embedding_model = 'text-embedding-3-small',
                embedding_version = '1.0'
            WHERE id = ${chunkItem.id};
          `;
        }
      }
    }

    // 9. Update document status to READY
    await db.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.READY,
        pageCount: extracted.pageCount,
        processingVersion: '1.0',
      },
    });

    console.log(`[Worker] Document ${documentId} vector indexing complete. Marked READY.`);
    return { status: 'completed', documentId, pageCount: extracted.pageCount, chunks: createdChunkIds.length };
  } catch (error: any) {
    console.error(`[Worker] Error processing document ${documentId}:`, error);

    await db.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.FAILED,
        processingError: error.message || 'PDF processing and embedding generation failed',
      },
    });

    throw error;
  }
}

export function startWorker() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  const worker = new Worker<ProcessDocumentPayload>(
    QueueName.DOCUMENT_PROCESSING,
    async (job) => processDocumentJob(job),
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully.`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err);
  });

  console.log('👷 Document worker active (Pages + Chunks + Question Extraction + Vectors)...');
  return worker;
}

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  startWorker();
}
