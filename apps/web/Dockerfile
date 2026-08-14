FROM node:20-alpine AS base

# Install necessary tools
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy all packages and apps
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install dependencies for the workspace
RUN pnpm install

# Build the web app
RUN pnpm run build --filter=@exam-ai/web

# Run the web app
WORKDIR /app/apps/web
CMD ["pnpm", "start"]
