# Implementation Plan

## Phase 0 — Planning

### Objective

Create and review the architecture before coding.

### Deliverables

- project documentation
- architecture
- database plan
- RAG plan
- API plan
- security plan
- UI/UX plan
- testing strategy

### Definition of Done

All documents agree and major technical risks are identified.

---

## Phase 1 — Repository Foundation

### Build

- pnpm monorepo
- Next.js application
- Fastify API
- shared TypeScript configuration
- linting
- formatting
- environment validation
- PostgreSQL
- pgvector
- Prisma
- Docker Compose
- basic CI
- testing foundation

### Definition of Done

Web, API, database and test environment run locally.

---

## Phase 2 — Authentication

### Build

- registration
- login
- logout
- session/token management
- protected routes
- user endpoint

### Definition of Done

Authenticated users can access a private dashboard.

---

## Phase 3 — Courses

### Build

- create
- list
- view
- update
- delete
- ownership checks

### Definition of Done

A user can manage courses and cannot access another user's course.

---

## Phase 4 — Storage and Documents

### Build

- R2 integration
- upload flow
- document records
- signed URLs
- document status

### Definition of Done

A PDF can be uploaded securely and tracked.

---

## Phase 5 — PDF Processing

### Build

- queue
- worker
- PDF extraction
- page storage
- cleaning
- chunking
- retry handling
- idempotency

### Definition of Done

A lecture PDF becomes READY with pages and chunks.

---

## Phase 6 — Embeddings and Vector Search

### Build

- embedding provider
- embedding jobs
- pgvector storage
- vector index
- course-scoped retrieval

### Definition of Done

A test query returns relevant lecture chunks.

---

## Phase 7 — RAG

### Build

- query embedding
- retrieval
- context builder
- AI provider abstraction
- grounded generation
- structured source identifiers
- citation mapping

### Definition of Done

The system answers a lecture question using relevant material and returns correct page citations.

---

## Phase 8 — Chat

### Build

- conversations
- messages
- chat UI
- streaming if appropriate
- citations
- source viewer

### Definition of Done

A student can have a persistent conversation with their course material.

### Milestone

MVP ALPHA.

---

## Phase 9 — Past Questions

### Build

- past-question document type
- question detection
- structured extraction
- question review/editing
- question storage

### Definition of Done

A past paper can be converted into editable individual questions.

---

## Phase 10 — AI Exam Answers

### Build

- question analysis
- lecture retrieval
- reference answer retrieval
- exam-answer generation
- citations
- answer styles

### Definition of Done

A selected exam question produces a grounded exam-ready answer.

### Milestone

MVP BETA.

---

## Phase 11 — Student Answer Evaluation

### Build

- student answer submission
- scoring
- strengths
- missing concepts
- feedback
- suggested answer

---

## Phase 12 — Quiz Engine

### Build

- quiz generation
- MCQ
- short answer
- quiz attempts
- marking
- results

---

## Phase 13 — Mock Exams

### Build

- exam generation
- timed sessions
- autosave
- submission
- marking
- results

---

## Phase 14 — Learning Analytics

### Build

- topic performance
- weak-topic detection
- strong-topic detection
- study recommendations
- readiness score

---

## Phase 15 — Production

### Build

- monitoring
- error tracking
- queue monitoring
- usage quotas
- AI cost controls
- database backups
- performance testing
- security review
- deployment
- production documentation

---

# Pre-Implementation Readiness Checklist

Before Phase 1:

- [ ] Product scope approved.
- [ ] Repository strategy approved.
- [ ] Monorepo structure approved.
- [ ] Database model reviewed.
- [ ] RAG architecture reviewed.
- [ ] Queue strategy reviewed.
- [ ] Storage strategy reviewed.
- [ ] AI provider abstraction agreed.
- [ ] Authentication approach agreed.
- [ ] Security requirements understood.
- [ ] Testing strategy understood.
- [ ] MVP acceptance criteria agreed.

# Cursor Implementation Rules

For every phase:

1. Read all relevant docs.
2. Inspect the existing repository.
3. Compare current state with the implementation plan.
4. Produce a phase-specific implementation plan.
5. Identify affected files.
6. Identify migrations.
7. Identify API changes.
8. Identify security implications.
9. Implement only the approved phase.
10. Run tests.
11. Run type checking.
12. Run linting.
13. Review the implementation.
14. Update documentation.
15. Report completed work and remaining issues.
16. Stop and wait for the next phase.

Never implement the entire roadmap in one pass.

# First Technical Milestone

```text
Create user
→ Create course
→ Upload lecture PDF
→ Store PDF
→ Queue processing
→ Extract pages
→ Chunk
→ Generate embeddings
→ Store vectors
→ Ask question
→ Retrieve relevant chunks
→ Generate grounded answer
→ Return exact page citation
```

# Second Technical Milestone

```text
Upload past-question PDF
→ Extract questions
→ Review/edit
→ Select question
→ Retrieve lectures
→ Retrieve reference answers
→ Generate exam answer
→ Return citations
```
