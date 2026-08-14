# System Architecture

## 1. Architecture Style

Use a modular monolith initially.

Do not introduce microservices until there is a measurable operational reason.

## 2. High-Level Architecture

```text
                 ┌─────────────────────┐
                 │     Next.js Web     │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │   Node/Fastify API  │
                 └──────┬───────┬──────┘
                        │       │
              ┌─────────┘       └──────────┐
              ▼                            ▼
      ┌───────────────┐             ┌──────────────┐
      │ PostgreSQL +  │             │ Cloudflare   │
      │    pgvector   │             │      R2      │
      └───────┬───────┘             └──────────────┘
              │
              ▼
       ┌──────────────┐
       │ Redis/Queue  │
       └──────┬───────┘
              ▼
       ┌──────────────┐
       │ Document     │
       │ Worker       │
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │ AI Provider  │
       │ abstraction  │
       └──────────────┘
```

## 3. Repository

```text
exam-ai/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── database/
│   ├── ai/
│   ├── rag/
│   ├── pdf/
│   ├── shared/
│   ├── validation/
│   └── config/
├── workers/
│   └── document-worker/
├── docs/
├── docker/
└── package.json
```

## 4. Main Runtime Components

### Web

Next.js + TypeScript.

Responsibilities:

- UI.
- Authentication flows.
- Course management.
- Upload UI.
- Chat.
- Questions.
- Answers.
- Source viewer.

### API

Node.js + Fastify + TypeScript.

Responsibilities:

- Authentication.
- Authorization.
- Course APIs.
- Document APIs.
- Chat APIs.
- Question APIs.
- Answer APIs.

### Worker

Responsible for asynchronous document processing.

Responsibilities:

- PDF extraction.
- Page creation.
- Chunking.
- Embeddings.
- Question extraction.
- Retry handling.

### PostgreSQL

Store:

- users
- courses
- documents
- pages
- chunks
- vectors
- conversations
- questions
- answers
- usage

### R2

Store original PDFs.

## 5. Queue Architecture

Use a durable queue for processing.

```text
API
 ↓
Create Document
 ↓
Queue PROCESS_DOCUMENT
 ↓
Worker
 ↓
Extract
 ↓
Chunk
 ↓
Embed
 ↓
Persist
 ↓
READY
```

Failures:

```text
Worker
 ↓
Failure
 ↓
Retry policy
 ↓
Retry
 ↓
Success
```

Jobs must be idempotent.

## 6. Important Design Decision

Do not use a simple in-process background task for critical document processing.

The job must be observable, recoverable and retryable.

## 7. AI Boundary

All AI calls must go through `packages/ai`.

The rest of the application should not depend directly on a particular model vendor.

## 8. Data Flow

### Upload

```text
Browser
→ API
→ R2
→ Document DB record
→ Queue
```

### RAG

```text
Question
→ embedding
→ vector retrieval
→ metadata filtering
→ context builder
→ LLM
→ structured answer/citations
```

## 9. Scalability

The first deployment can run:

- one web instance
- one API instance
- one worker

Workers can later scale horizontally without changing the core domain model.
