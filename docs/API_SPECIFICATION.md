# API Specification

## 1. API Principles

- REST
- JSON
- authenticated endpoints
- schema validation
- consistent errors
- request IDs
- ownership enforcement

Base:

```text
/api/v1
```

## 2. Authentication

```text
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me
```

## 3. Courses

```text
POST   /courses
GET    /courses
GET    /courses/:courseId
PATCH  /courses/:courseId
DELETE /courses/:courseId
```

## 4. Documents

```text
POST   /courses/:courseId/documents
GET    /courses/:courseId/documents
GET    /documents/:documentId
PATCH  /documents/:documentId
DELETE /documents/:documentId
POST   /documents/:documentId/reprocess
```

Upload should preferably use a signed/direct R2 upload flow for larger files.

## 5. Conversations

```text
POST   /courses/:courseId/conversations
GET    /courses/:courseId/conversations
GET    /conversations/:conversationId
DELETE /conversations/:conversationId
```

## 6. Chat

```text
POST /courses/:courseId/chat
```

Request:

```json
{
  "conversationId": "...",
  "message": "What is 3NF?"
}
```

Response:

```json
{
  "message": {
    "id": "...",
    "role": "ASSISTANT",
    "content": "..."
  },
  "citations": [
    {
      "documentId": "...",
      "documentName": "...",
      "page": 14,
      "excerpt": "..."
    }
  ]
}
```

## 7. Questions

```text
GET  /courses/:courseId/questions
GET  /questions/:questionId
PATCH /questions/:questionId
DELETE /questions/:questionId
```

## 8. Generate Answer

```text
POST /questions/:questionId/answer
```

Request:

```json
{
  "style": "EXAM"
}
```

Response:

```json
{
  "answer": {
    "id": "...",
    "content": "..."
  },
  "citations": []
}
```

## 9. Document Processing

Document status is retrieved through:

```text
GET /documents/:documentId
```

The client should poll initially or later use server-sent events/websocket updates if useful.

## 10. Error Format

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document not found",
    "requestId": "..."
  }
}
```

Never expose stack traces in production.

## 11. Authorization

Every resource lookup must verify:

```text
authenticated user
+
resource ownership
```

Do not use resource IDs as proof of authorization.
