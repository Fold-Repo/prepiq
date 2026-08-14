# Production Guide

This guide outlines how to deploy the ExamPrep AI platform to a production environment using the provided Docker configuration.

## Prerequisites
- Docker and Docker Compose installed on your server.
- An OpenAI API Key (`OPENAI_API_KEY`).
- A secure JWT Secret (`JWT_SECRET`).

## 1. Environment Setup

Create a `.env` file in the root directory (or export these in your shell):
```bash
OPENAI_API_KEY=sk-your-openai-key
JWT_SECRET=generate-a-long-secure-random-string
```

## 2. Deployment

To build and start the entire stack (Database, Redis, API, and Web Application):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The services will be available at:
- **Web App**: `http://localhost:3000`
- **API**: `http://localhost:4000`
- **Queue Monitor**: `http://localhost:4000/admin/queues`

## 3. Database Backups

The PostgreSQL database uses a Docker volume (`pgdata`). To create a secure backup without bringing the database down:

```bash
docker exec -t examprep-db-1 pg_dumpall -c -U examai > backup_$(date +%Y-%m-%d).sql
```
*(Note: Replace `examprep-db-1` with the actual container name for your db service, you can find it using `docker ps`)*

To restore from a backup:
```bash
cat backup_file.sql | docker exec -i examprep-db-1 psql -U examai
```

## 4. Security Highlights
- **Rate Limiting**: The API is configured with `@fastify/rate-limit` to prevent abuse (default 100 requests per minute).
- **Security Headers**: `@fastify/helmet` is enabled to set appropriate HTTP security headers.
- **Monitoring**: All API errors are logged in a structured JSON format to `stdout` within the Docker container, allowing easy aggregation by CloudWatch, Datadog, or ELK.
