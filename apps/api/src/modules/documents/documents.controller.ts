import { FastifyRequest, FastifyReply } from 'fastify';
import { DocumentsService } from './documents.service';
import { DocumentType } from '@exam-ai/database';
import { formatSuccessResponse, formatErrorResponse } from '@exam-ai/shared';
import {
  updateDocumentSchema,
  updatePageContentSchema,
  upsertSectionSchema,
  reprocessDocumentSchema,
} from '@exam-ai/validation';

const documentsService = new DocumentsService();

function multipartValue(fields: Record<string, any>, name: string): string | undefined {
  const field = fields[name];
  if (!field) return undefined;
  const item = Array.isArray(field) ? field[0] : field;
  return item?.value;
}

function optionalInt(value?: string): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export class DocumentsController {
  async upload(
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { courseId } = request.params;

    const data = await request.file();
    if (!data) {
      return reply.status(400).send(
        formatErrorResponse('MISSING_FILE', 'No PDF file attached in upload request', request.id)
      );
    }

    const buffer = await data.toBuffer();
    const fields = data.fields as Record<string, any>;
    const docTypeHeader = multipartValue(fields, 'type') || DocumentType.LECTURE;

    const document = await documentsService.uploadDocument({
      courseId,
      userId: userPayload.id,
      filename: data.filename,
      mimeType: data.mimetype,
      buffer,
      type: docTypeHeader as DocumentType,
      contentStartPage: optionalInt(multipartValue(fields, 'contentStartPage')),
      contentEndPage: optionalInt(multipartValue(fields, 'contentEndPage')),
    });

    return reply.status(201).send(formatSuccessResponse(document));
  }

  async listByCourse(
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) {
    const documents = await documentsService.getCourseDocuments(
      request.params.courseId,
      request.user.id
    );
    return reply.status(200).send(formatSuccessResponse(documents));
  }

  async getById(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const document = await documentsService.getDocumentDetails(
      request.params.documentId,
      request.user.id
    );
    return reply.status(200).send(formatSuccessResponse(document));
  }

  async update(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const parsed = updateDocumentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid body', request.id)
      );
    }
    const document = await documentsService.updateDocument(
      request.params.documentId,
      request.user.id,
      parsed.data
    );
    return reply.status(200).send(formatSuccessResponse(document));
  }

  async delete(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    await documentsService.deleteDocument(request.params.documentId, request.user.id);
    return reply.status(200).send(
      formatSuccessResponse({ message: 'Document deleted successfully' })
    );
  }

  async reprocess(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const parsed = reprocessDocumentSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid body', request.id)
      );
    }
    const document = await documentsService.reprocessDocument(
      request.params.documentId,
      request.user.id,
      parsed.data
    );
    return reply.status(200).send(formatSuccessResponse(document));
  }

  async listPages(
    request: FastifyRequest<{
      Params: { documentId: string };
      Querystring: { page?: string; limit?: string; excluded?: string; search?: string; summary?: string };
    }>,
    reply: FastifyReply
  ) {
    const { page, limit, excluded, search, summary } = request.query;
    const result = await documentsService.listPages(request.params.documentId, request.user.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      excluded: excluded === 'true' ? true : excluded === 'false' ? false : undefined,
      search,
      summary: summary === 'true',
    });
    return reply.status(200).send(formatSuccessResponse(result));
  }

  async getPage(
    request: FastifyRequest<{ Params: { documentId: string; pageNumber: string } }>,
    reply: FastifyReply
  ) {
    const page = await documentsService.getPage(
      request.params.documentId,
      request.user.id,
      Number(request.params.pageNumber)
    );
    return reply.status(200).send(formatSuccessResponse(page));
  }

  async updatePage(
    request: FastifyRequest<{ Params: { documentId: string; pageNumber: string } }>,
    reply: FastifyReply
  ) {
    const parsed = updatePageContentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid body', request.id)
      );
    }
    const page = await documentsService.updatePage(
      request.params.documentId,
      request.user.id,
      Number(request.params.pageNumber),
      parsed.data
    );
    return reply.status(200).send(formatSuccessResponse(page));
  }

  async reindexPage(
    request: FastifyRequest<{ Params: { documentId: string; pageNumber: string } }>,
    reply: FastifyReply
  ) {
    const result = await documentsService.reindexPage(
      request.params.documentId,
      request.user.id,
      Number(request.params.pageNumber)
    );
    return reply.status(200).send(formatSuccessResponse(result));
  }

  async listSections(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const sections = await documentsService.listSections(request.params.documentId, request.user.id);
    return reply.status(200).send(formatSuccessResponse(sections));
  }

  async createSection(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const parsed = upsertSectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid body', request.id)
      );
    }
    const section = await documentsService.createSection(
      request.params.documentId,
      request.user.id,
      parsed.data
    );
    return reply.status(201).send(formatSuccessResponse(section));
  }

  async updateSection(
    request: FastifyRequest<{ Params: { sectionId: string } }>,
    reply: FastifyReply
  ) {
    const parsed = upsertSectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid body', request.id)
      );
    }
    const section = await documentsService.updateSection(
      request.params.sectionId,
      request.user.id,
      parsed.data
    );
    return reply.status(200).send(formatSuccessResponse(section));
  }

  async deleteSection(
    request: FastifyRequest<{ Params: { sectionId: string } }>,
    reply: FastifyReply
  ) {
    await documentsService.deleteSection(request.params.sectionId, request.user.id);
    return reply.status(200).send(formatSuccessResponse({ message: 'Section deleted' }));
  }

  async file(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const file = await documentsService.getFileBuffer(request.params.documentId, request.user.id);
    return reply
      .type(file.mimeType || 'application/pdf')
      .header('Content-Disposition', `inline; filename="${file.filename}"`)
      .send(file.buffer);
  }
}
