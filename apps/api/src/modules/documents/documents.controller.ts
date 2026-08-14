import { FastifyRequest, FastifyReply } from 'fastify';
import { DocumentsService } from './documents.service';
import { DocumentType } from '@exam-ai/database';
import { formatSuccessResponse, formatErrorResponse } from '@exam-ai/shared';

const documentsService = new DocumentsService();

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
    const docTypeHeader = (data.fields.type as any)?.value || DocumentType.LECTURE;

    const document = await documentsService.uploadDocument({
      courseId,
      userId: userPayload.id,
      filename: data.filename,
      mimeType: data.mimetype,
      buffer,
      type: docTypeHeader as DocumentType,
    });

    return reply.status(201).send(formatSuccessResponse(document));
  }

  async listByCourse(
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { courseId } = request.params;

    const documents = await documentsService.getCourseDocuments(courseId, userPayload.id);
    return reply.status(200).send(formatSuccessResponse(documents));
  }

  async getById(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { documentId } = request.params;

    const document = await documentsService.getDocumentDetails(documentId, userPayload.id);
    return reply.status(200).send(formatSuccessResponse(document));
  }

  async delete(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { documentId } = request.params;

    await documentsService.deleteDocument(documentId, userPayload.id);
    return reply.status(200).send(
      formatSuccessResponse({ message: 'Document deleted successfully' })
    );
  }

  async reprocess(
    request: FastifyRequest<{ Params: { documentId: string } }>,
    reply: FastifyReply
  ) {
    const userPayload = request.user;
    const { documentId } = request.params;

    const document = await documentsService.reprocessDocument(documentId, userPayload.id);
    return reply.status(200).send(formatSuccessResponse(document));
  }
}
