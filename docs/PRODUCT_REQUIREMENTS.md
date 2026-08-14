# Product Requirements

## 1. Users

Primary user:

- Student preparing for an examination.

## 2. Course Management

Users must be able to:

- Create a course.
- Rename a course.
- Delete a course.
- View course documents.
- View course questions.
- Start a conversation within a course.

## 3. Document Management

Supported initial document types:

- Lecture
- Past question
- Question and answer/reference
- Other

Users must be able to:

- Upload PDF.
- See processing status.
- Rename document.
- Delete document.
- Retry failed processing.
- View document metadata.

Statuses:

- UPLOADED
- QUEUED
- PROCESSING
- INDEXING
- READY
- FAILED

## 4. Lecture Chat

Users can ask questions against a course.

Requirements:

- Retrieval must be restricted to the selected course.
- Answers must be grounded in retrieved material.
- Sources must identify document and page.
- Conversation history must be persisted.
- The system should explicitly say when the course material is insufficient.

## 5. Past Questions

The system should:

- Process question PDFs.
- Detect individual questions.
- Extract question number.
- Extract question text.
- Detect marks when possible.
- Detect question type when possible.
- Allow the user to edit extracted questions.

## 6. AI Exam Answers

A user selects a question and asks the system to answer it.

The system should:

- Analyse the question.
- Retrieve relevant lecture material.
- Retrieve relevant reference answers where available.
- Generate an exam-appropriate response.
- Provide citations.
- Avoid fabricating source claims.

Initial answer styles:

- SHORT
- EXAM
- DETAILED
- STEP_BY_STEP

## 7. Future Learning Features

Later releases may include:

- Student answer evaluation.
- AI scoring.
- Missing-point detection.
- Quizzes.
- Flashcards.
- Mock exams.
- Weak-topic detection.
- Personalised revision plans.

## 8. Non-Functional Requirements

### Reliability

Document processing must use durable queue semantics.

A failed job should remain recoverable and support controlled retry.

### Security

- Authenticated access.
- Course ownership checks.
- Document ownership checks.
- Secure signed file URLs.
- File type and size validation.
- Rate limiting.
- Input validation.
- Prompt injection defence.

### Performance

Chat retrieval should be fast enough for interactive use.

Document processing can be asynchronous.

### Observability

Track:

- Request IDs.
- Processing status.
- Queue failures.
- Retry count.
- AI model.
- AI latency.
- Token usage.
- Estimated AI cost.

## 9. MVP Acceptance Criteria

The MVP is complete when:

1. A student can create a course.
2. A student can upload a lecture PDF.
3. The PDF is processed asynchronously.
4. Pages and chunks are stored.
5. Embeddings are searchable.
6. The student can ask a question.
7. Relevant course content is retrieved.
8. The answer is grounded.
9. Citations identify real pages/chunks.
10. A past-question PDF can be uploaded.
11. Questions can be extracted and reviewed.
12. A selected question can receive an AI-generated exam answer with citations.
