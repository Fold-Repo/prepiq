# AI Exam Study Assistant — Project Document

## 1. Product Vision

Build an AI-powered exam preparation platform that turns a student's lecture material and past examination papers into an interactive personal study assistant.

A student should be able to:

- Create a course/module.
- Upload lecture PDFs.
- Upload past-question PDFs.
- Upload question-and-answer/reference PDFs.
- Chat with course material.
- Ask questions and receive grounded answers.
- See the exact document/page used as evidence.
- Select an exam question and generate an exam-ready answer.
- Submit their own answer and eventually receive AI marking and feedback.
- Progressively use quizzes, mock exams and performance analytics.

### Core product loop

Upload → Understand → Ask → Practise → Answer → Evaluate → Improve.

## 2. MVP Goal

The first usable MVP must prove two workflows.

### Workflow A — Lecture RAG

Upload one lecture PDF → process it → ask a question → retrieve relevant lecture content → generate an answer → show exact source/page citations.

### Workflow B — Exam Question Answering

Upload a past-question PDF → extract questions → select a question → retrieve relevant lecture/reference material → generate an exam-ready answer → show citations.

## 3. Product Positioning

Do not position the product as merely a "chat with PDF" tool.

Position it as:

> Turn your lecture notes into your personal AI exam tutor.

## 4. Scope

### V1

- Authentication
- Courses
- PDF upload
- Cloud object storage
- PDF processing
- Page-level text extraction
- Chunking
- Embeddings
- Vector retrieval
- RAG chat
- Conversations
- Source citations
- Past-question extraction
- Question review/editing
- AI exam answers
- Answer citations

### Later

- Student answer evaluation
- Quizzes
- Flashcards
- Mock exams
- Topic analytics
- Study recommendations
- Billing/subscriptions

## 5. Engineering Principles

1. Modular monolith first.
2. Keep AI provider access behind abstractions.
3. Treat uploaded documents as untrusted data.
4. Preserve document/page provenance throughout ingestion and retrieval.
5. Use durable queue-based processing for long-running document jobs.
6. Make processing idempotent.
7. Keep failed work observable and retryable.
8. Enforce tenant/user/course isolation at every retrieval boundary.
9. Do not allow the LLM to invent citations.
10. Build measurable RAG evaluation before assuming the AI is reliable.

## 6. First Technical Milestone

The first end-to-end success criterion is:

```text
Upload lecture PDF
→ Store PDF
→ Queue processing
→ Extract pages
→ Chunk
→ Generate embeddings
→ Store vectors
→ Ask question
→ Retrieve relevant chunks
→ Generate grounded answer
→ Return page citations
```

Do not start quizzes or mock exams until this workflow is reliable.
