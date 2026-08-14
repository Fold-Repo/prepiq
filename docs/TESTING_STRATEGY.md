# Testing Strategy

## 1. Testing Layers

Use:

1. Unit tests
2. Integration tests
3. API tests
4. Worker tests
5. RAG evaluation
6. End-to-end tests

## 2. Unit Tests

Test:

- authentication rules
- ownership checks
- chunking
- text cleaning
- context building
- citation mapping
- question parsing
- retry logic

## 3. Database Tests

Verify:

- foreign keys
- uniqueness
- ownership queries
- vector metadata filtering

## 4. Worker Tests

Test:

### Success

```text
queued
→ processing
→ indexing
→ ready
```

### Failure

```text
queued
→ processing
→ failure
→ retry
→ success
```

### Permanent failure

Verify that a poison job becomes observable after retry limits.

## 5. API Tests

Test:

- valid requests
- invalid requests
- unauthenticated requests
- unauthorized resource access
- missing resources
- rate limits

## 6. RAG Tests

Build a small gold dataset.

Example:

```text
Question:
What is third normal form?

Expected document:
Database Lecture 3

Expected page:
14
```

Measure:

- retrieval recall
- source accuracy
- citation accuracy
- answer relevance
- grounding

## 7. Security Tests

Explicitly test:

- user A cannot access user B's course
- user A cannot retrieve user B's vectors
- signed URLs cannot expose unauthorized files
- prompt injection in PDFs does not override system rules

## 8. E2E MVP Test

The most important E2E scenario:

```text
Register
→ Create course
→ Upload lecture
→ Wait for READY
→ Ask question
→ Verify answer
→ Verify citation
```

Second:

```text
Upload past paper
→ Extract questions
→ Review question
→ Generate answer
→ Verify citations
```

## 9. Regression

Every completed phase must leave existing tests passing.

Do not move to the next phase with known failing core tests.
