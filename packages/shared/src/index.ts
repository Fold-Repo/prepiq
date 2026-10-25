export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export enum QueueName {
  DOCUMENT_PROCESSING = 'document-processing',
}

export interface ProcessDocumentPayload {
  documentId: string;
  courseId: string;
  userId: string;
  storageKey: string;
  type: string;
  forceIndex?: boolean;
}

export function formatErrorResponse(code: string, message: string, requestId?: string): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      requestId,
    },
  };
}

export function formatSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}
