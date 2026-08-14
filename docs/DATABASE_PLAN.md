# Database Plan

## 1. Database

PostgreSQL with pgvector.

ORM:

- Prisma

## 2. Core Entities

```text
User
 └── Course
      ├── Document
      │    ├── DocumentPage
      │    │    └── DocumentChunk
      │    └── Questions
      ├── Conversation
      │    └── ConversationMessage
      │         └── MessageCitation
      └── Question
           └── GeneratedAnswer
```

## 3. User

Fields:

- id
- email
- name
- passwordHash or external auth identifier
- createdAt
- updatedAt

## 4. Course

Fields:

- id
- userId
- name
- description
- academicYear
- createdAt
- updatedAt

Indexes:

- userId
- userId + name where useful

## 5. Document

Fields:

- id
- courseId
- userId
- name
- originalFilename
- type
- mimeType
- storageKey
- status
- pageCount
- processingError
- processingVersion
- createdAt
- updatedAt

Indexes:

- courseId
- userId
- status

## 6. DocumentPage

Fields:

- id
- documentId
- pageNumber
- content
- createdAt

Unique constraint:

- documentId + pageNumber

## 7. DocumentChunk

Fields:

- id
- documentId
- pageId
- courseId
- pageNumber
- sectionTitle
- content
- tokenCount
- embedding
- embeddingModel
- embeddingVersion
- createdAt

Indexes:

- courseId
- documentId
- pageId
- vector index on embedding

## 8. Conversation

Fields:

- id
- userId
- courseId
- title
- createdAt
- updatedAt

Indexes:

- userId
- courseId

## 9. ConversationMessage

Fields:

- id
- conversationId
- role
- content
- metadata
- createdAt

## 10. MessageCitation

Fields:

- id
- messageId
- documentId
- pageId
- chunkId
- pageNumber
- excerpt
- relevanceScore

## 11. Question

Fields:

- id
- courseId
- documentId
- questionNumber
- content
- type
- marks
- metadata
- createdAt

## 12. GeneratedAnswer

Fields:

- id
- questionId
- userId
- answer
- answerStyle
- confidence
- createdAt

## 13. AIUsage

Fields:

- id
- userId
- operation
- model
- inputTokens
- outputTokens
- estimatedCost
- createdAt

## 14. Ownership Rules

Every query involving user-owned data must enforce ownership.

Never trust a client-provided courseId/documentId without verifying ownership.

## 15. Future Tables

Later:

- StudentAnswer
- AnswerCitation
- Quiz
- QuizQuestion
- QuizAttempt
- QuizResponse
- Exam
- ExamQuestion
- ExamAttempt
- Topic
- UserTopicPerformance

Do not add these to V1 unless required by implementation dependencies.
