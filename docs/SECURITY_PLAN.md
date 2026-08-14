# Security Plan

## 1. Authentication

All protected resources require authenticated access.

Use secure session/token practices.

Passwords must never be stored in plaintext.

## 2. Authorization

Every user-owned resource must be checked.

Examples:

- Course belongs to user.
- Document belongs to course and user.
- Conversation belongs to user.
- Question belongs to user's course.

## 3. File Upload Security

Validate:

- extension
- MIME type
- file size

Use generated storage keys.

Never use the original filename as a storage path.

Store uploaded PDFs outside the public application filesystem.

## 4. Object Storage

Use signed URLs for document access.

Do not expose permanent public R2 URLs for private student documents.

## 5. PDF Processing

Uploaded documents are untrusted.

Processing must:

- never execute PDF content
- isolate parsing where practical
- enforce resource limits
- handle malformed files
- support timeouts

Consider malware scanning before production.

## 6. Prompt Injection

PDF text is data, not instructions.

The system must explicitly separate:

- system instructions
- user request
- retrieved document content

Retrieved content must not be allowed to override system instructions.

## 7. RAG Isolation

Vector searches must filter by:

```text
userId/courseId
```

A user must never be able to retrieve another user's chunks.

## 8. API Security

Implement:

- schema validation
- rate limiting
- request size limits
- authentication
- authorization
- CORS policy
- secure headers

## 9. AI Security

Do not send unnecessary sensitive information to the AI provider.

Track AI usage without logging full document contents unnecessarily.

## 10. Secrets

Secrets must only exist in environment configuration.

Provide `.env.example`.

Never commit:

- API keys
- database passwords
- storage secrets
- auth secrets

## 11. Queue Security

Queue payloads should contain IDs rather than large document contents.

Jobs should be idempotent.

Retries must have limits and backoff.

Poison jobs must be observable.

## 12. Logging

Never log:

- passwords
- auth tokens
- private file contents
- unnecessary personal information

Use request IDs for correlation.

## 13. Production Security Review

Before launch:

- dependency audit
- API authorization tests
- upload abuse tests
- prompt injection tests
- cross-user retrieval tests
- rate-limit tests
- signed URL tests
