import { randomUUID } from 'crypto';
import {
  db,
  DocumentStatus,
  DocumentType,
  OfficialAnswerSource,
  QuestionSource,
  QuestionType,
} from '@exam-ai/database';
import { getAIProvider, extractExamQuestions, extractSyllabusTopics, inferMcqAnswer, normalizeOptions } from '@exam-ai/ai';
import { retrieveCourseChunks } from '@exam-ai/rag';
import {
  extractPagesFromPDFBuffer,
  chunkPageContent,
  extractSectionsFromPages,
  isPageInContentRange,
  wordCount,
} from '@exam-ai/pdf';
import { StorageService } from './storage.service';

const RANGE_SENSITIVE_TYPES: DocumentType[] = [
  DocumentType.PAST_QUESTION,
  DocumentType.QUESTION_ANSWER,
  DocumentType.SYLLABUS,
];

function parseQuestionType(value?: string | null): QuestionType {
  if (value && Object.values(QuestionType).includes(value as QuestionType)) {
    return value as QuestionType;
  }
  return QuestionType.SHORT_ANSWER;
}

export async function processDocument(input: {
  documentId: string;
  courseId: string;
  storageKey: string;
  forceIndex?: boolean;
}) {
  const { documentId, courseId, storageKey, forceIndex } = input;
  const storageService = new StorageService();

  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  await db.document.update({
    where: { id: documentId },
    data: { status: DocumentStatus.PROCESSING, processingError: null },
  });

  const pdfBuffer = await storageService.downloadFile(storageKey);
  const extracted = await extractPagesFromPDFBuffer(pdfBuffer);

  await db.question.deleteMany({
    where: { documentId, source: QuestionSource.EXTRACTED },
  });
  await db.syllabusTopic.deleteMany({ where: { documentId } });
  await db.documentChunk.deleteMany({ where: { documentId } });
  await db.documentSection.deleteMany({ where: { documentId } });
  await db.documentPage.deleteMany({ where: { documentId } });

  const startPage = document.contentStartPage;
  const endPage = document.contentEndPage;
  const createdPages: { id: string; pageNumber: number; content: string; isExcluded: boolean }[] = [];

  for (const page of extracted.pages) {
    const content = page.content || '';
    const words = wordCount(content);
    const isExcluded = !isPageInContentRange(page.pageNumber, startPage, endPage);

    const pageRecord = await db.documentPage.create({
      data: {
        documentId,
        pageNumber: page.pageNumber,
        content,
        wordCount: words,
        isEmpty: words === 0,
        isExcluded,
      },
    });

    createdPages.push({
      id: pageRecord.id,
      pageNumber: page.pageNumber,
      content,
      isExcluded,
    });
  }

  const needsRangeConfirm =
    RANGE_SENSITIVE_TYPES.includes(document.type) && startPage == null && !forceIndex;

  if (needsRangeConfirm) {
    await db.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.AWAITING_RANGE,
        pageCount: extracted.pageCount,
        processingVersion: '2.0',
      },
    });
    return { status: DocumentStatus.AWAITING_RANGE, pageCount: extracted.pageCount, chunks: 0 };
  }

  const inRangePages = createdPages.filter((page) => !page.isExcluded);
  const pageIdByNumber = new Map(createdPages.map((page) => [page.pageNumber, page.id]));

  const detectedSections = extractSectionsFromPages(
    inRangePages.map((page) => ({ pageNumber: page.pageNumber, content: page.content }))
  );

  const createdSections: { id: string; title: string; pageStart: number; pageEnd: number }[] = [];
  for (const section of detectedSections) {
    const created = await db.documentSection.create({
      data: {
        documentId,
        courseId,
        title: section.title,
        pageStart: section.pageStart,
        pageEnd: section.pageEnd,
        order: section.order,
      },
    });
    createdSections.push(created);
  }

  function sectionForPage(pageNumber: number) {
    return createdSections.find(
      (section) => pageNumber >= section.pageStart && pageNumber <= section.pageEnd
    );
  }

  await db.document.update({
    where: { id: documentId },
    data: { status: DocumentStatus.INDEXING },
  });

  const aiProvider = getAIProvider();
  let totalChunks = 0;

  for (const page of inRangePages) {
    const chunks = chunkPageContent(page.pageNumber, page.content, {
      targetTokens: 600,
      overlapTokens: 100,
    });
    if (chunks.length === 0) continue;

    const embeddingResults = await aiProvider.generateEmbeddings(chunks.map((chunk) => chunk.content));
    const section = sectionForPage(page.pageNumber);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddingResults[i]?.embedding;
      if (!embedding) continue;

      const vectorStr = `[${embedding.join(',')}]`;
      await db.$executeRawUnsafe(
        `INSERT INTO document_chunks (
          id, "documentId", "courseId", "pageId", "pageNumber", "sectionId", "sectionTitle",
          content, "tokenCount", embedding, "embeddingModel", "embeddingVersion"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector, $11, $12)`,
        randomUUID(),
        documentId,
        courseId,
        page.id,
        chunk.pageNumber,
        section?.id || null,
        chunk.sectionTitle || section?.title || null,
        chunk.content,
        chunk.tokenCount,
        vectorStr,
        process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        '1.0'
      );
      totalChunks++;
    }
  }

  if (document.type === DocumentType.PAST_QUESTION || document.type === DocumentType.QUESTION_ANSWER) {
    try {
      const questions = await extractExamQuestions(aiProvider, inRangePages, true);
      const syllabusTopics = await db.syllabusTopic.findMany({
        where: { courseId },
        select: { id: true, title: true, description: true },
      });

      for (const question of questions) {
        const pageId =
          question.pageNumber != null ? pageIdByNumber.get(question.pageNumber) : undefined;
        const section =
          question.pageNumber != null ? sectionForPage(question.pageNumber) : undefined;
        const options = normalizeOptions(question.options);
        let correctOption = question.correctOption || null;
        let officialAnswer = question.officialAnswer?.trim() || question.explanation?.trim() || null;
        let officialAnswerSource: OfficialAnswerSource = officialAnswer
          ? OfficialAnswerSource.EXTRACTED
          : OfficialAnswerSource.NONE;

        if (options.length >= 2 && (!correctOption || !officialAnswer)) {
          const lookupQuery = [question.syllabusRef, question.content, ...options.map((o) => o.text)]
            .filter(Boolean)
            .join(' ');
          const chunks = await retrieveCourseChunks({
            userId: document.userId,
            courseId,
            query: lookupQuery,
            limit: 8,
            minSimilarity: 0.2,
          });
          const inferred = await inferMcqAnswer(aiProvider, {
            stem: question.content,
            options,
            syllabusRef: question.syllabusRef,
            courseContext: chunks.map((chunk) => `[p.${chunk.pageNumber}] ${chunk.content}`).join('\n\n'),
          });
          if (!correctOption) correctOption = inferred.correctOption;
          if (!officialAnswer && inferred.explanation) {
            officialAnswer = inferred.explanation;
            officialAnswerSource =
              inferred.usedContext && chunks.length > 0
                ? OfficialAnswerSource.CONTEXT
                : OfficialAnswerSource.AI;
          }
        }

        const syllabusTopicId =
          question.syllabusRef
            ? syllabusTopics.find((topic) =>
                topic.title.toLowerCase().includes(
                  (question.syllabusRef || '').split(' ')[0].toLowerCase().replace(/\s+/g, '')
                ) || (question.syllabusRef || '').toLowerCase().includes(topic.title.toLowerCase())
              )?.id
            : null;

        await db.question.create({
          data: {
            courseId,
            documentId,
            pageId: pageId || null,
            sectionId: section?.id || null,
            syllabusTopicId: syllabusTopicId || null,
            questionNumber: question.questionNumber || 'Q',
            content: question.content,
            marks: question.marks != null ? Math.round(question.marks) : null,
            type: parseQuestionType(question.type),
            options: options.length ? JSON.parse(JSON.stringify(options)) : undefined,
            correctOption,
            officialAnswer,
            officialAnswerSource,
            extractionConfidence: question.confidence ?? null,
            source: QuestionSource.EXTRACTED,
            metadata: question.syllabusRef
              ? { syllabusRef: question.syllabusRef }
              : undefined,
          },
        });
      }
    } catch (error) {
      console.warn(`[Processor] Question extraction failed for ${documentId}:`, error);
    }
  }

  if (document.type === DocumentType.SYLLABUS) {
    try {
      const topics = await extractSyllabusTopics(aiProvider, inRangePages);

      async function persistTopics(
        items: Awaited<ReturnType<typeof extractSyllabusTopics>>,
        parentId: string | null,
        orderOffset = 0
      ) {
        for (let i = 0; i < items.length; i++) {
          const topic = items[i];
          const created = await db.syllabusTopic.create({
            data: {
              courseId,
              documentId,
              parentId,
              title: topic.title,
              description: topic.description || null,
              weekNumber: topic.weekNumber ?? null,
              pageStart: topic.pageStart ?? null,
              pageEnd: topic.pageEnd ?? null,
              order: orderOffset + i,
            },
          });
          if (topic.children?.length) {
            await persistTopics(topic.children, created.id);
          }
        }
      }

      await persistTopics(topics, null);
    } catch (error) {
      console.warn(`[Processor] Syllabus extraction failed for ${documentId}:`, error);
    }
  }

  await db.document.update({
    where: { id: documentId },
    data: {
      status: DocumentStatus.READY,
      pageCount: extracted.pageCount,
      processingVersion: '2.0',
    },
  });

  return { status: DocumentStatus.READY, pageCount: extracted.pageCount, chunks: totalChunks };
}

export async function reindexDocumentPage(documentId: string, pageNumber: number) {
  const document = await db.document.findUnique({ where: { id: documentId } });
  if (!document) {
    throw new Error(`Document ${documentId} not found`);
  }

  const page = await db.documentPage.findUnique({
    where: { documentId_pageNumber: { documentId, pageNumber } },
  });
  if (!page) {
    throw new Error(`Page ${pageNumber} not found`);
  }

  await db.documentChunk.deleteMany({ where: { pageId: page.id } });

  if (page.isExcluded || page.isEmpty) {
    return { chunks: 0 };
  }

  const section = await db.documentSection.findFirst({
    where: {
      documentId,
      pageStart: { lte: pageNumber },
      pageEnd: { gte: pageNumber },
    },
    orderBy: { order: 'asc' },
  });

  const chunks = chunkPageContent(page.pageNumber, page.content, {
    targetTokens: 600,
    overlapTokens: 100,
  });
  if (chunks.length === 0) return { chunks: 0 };

  const aiProvider = getAIProvider();
  const embeddingResults = await aiProvider.generateEmbeddings(chunks.map((chunk) => chunk.content));
  let created = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddingResults[i]?.embedding;
    if (!embedding) continue;

    const vectorStr = `[${embedding.join(',')}]`;
    await db.$executeRawUnsafe(
      `INSERT INTO document_chunks (
        id, "documentId", "courseId", "pageId", "pageNumber", "sectionId", "sectionTitle",
        content, "tokenCount", embedding, "embeddingModel", "embeddingVersion"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector, $11, $12)`,
      randomUUID(),
      documentId,
      document.courseId,
      page.id,
      chunk.pageNumber,
      section?.id || null,
      chunk.sectionTitle || section?.title || null,
      chunk.content,
      chunk.tokenCount,
      vectorStr,
      process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      '1.0'
    );
    created++;
  }

  return { chunks: created };
}
