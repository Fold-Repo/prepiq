# UI/UX Plan

## 1. Product Navigation

Primary navigation:

```text
Dashboard
Courses
Settings
```

Within a course:

```text
Overview
Documents
Chat
Questions
```

Later:

```text
Quizzes
Exams
Progress
```

## 2. Dashboard

Show:

- courses
- recent documents
- recent conversations
- processing status

Keep the first version simple.

## 3. Course Page

Course header:

- course name
- description
- document count
- question count

Tabs:

- Overview
- Documents
- Chat
- Questions

## 4. Document Upload

Upload flow:

1. Select PDF.
2. Select document type.
3. Upload.
4. Show processing status.
5. Notify when ready.

Status states:

```text
Uploading
Queued
Processing
Indexing
Ready
Failed
```

Failed state should offer:

```text
Retry
```

## 5. Chat

Two-panel desktop layout:

```text
+----------------+-----------------------------+
| Course         | Conversation               |
|                |                             |
| Documents      | User message                |
| Lecture 1      | AI response                 |
| Lecture 2      |                             |
| Lecture 3      | Sources                     |
|                | Page 14                     |
+----------------+-----------------------------+
```

Mobile should collapse navigation.

## 6. Sources

Sources should be visible and clickable.

Example:

```text
Sources

Lecture 3 — Page 14
Lecture 4 — Page 8
```

Clicking should open the document viewer at the cited page.

## 7. Questions

Past questions page:

```text
Past Exam 2025

Q1  Explain...
Q2  Describe...
Q3  Discuss...
```

Each question can:

- open
- edit
- generate answer

## 8. Answer View

```text
Question
────────

AI Answer
────────

Sources
────────

Lecture 3 · Page 14
```

Later:

```text
Your Answer
AI Score
Feedback
Missing Concepts
Suggested Answer
```

## 9. Design Principles

- Clear
- Academic
- Minimal
- Fast
- Source-transparent
- Mobile responsive

Avoid excessive dashboards in V1.

## 10. Important UX Rule

Always communicate processing states.

Never leave a student wondering whether their document is stuck.
