FROM node:20-alpine AS base

# Install necessary tools
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all packages and apps
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies for the workspace
RUN pnpm install

# Generate Prisma Client
RUN pnpm run db:generate

# Build the API
RUN pnpm run build --filter=@exam-ai/api

# Run the API
WORKDIR /app/apps/api
CMD ["pnpm", "start"]
