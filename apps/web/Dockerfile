FROM oven/bun:latest AS builder
WORKDIR /app

# Copy manifests first for cacheable install (workspace layout must match
# the root package.json's `workspaces` paths so bun resolves them).
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/consts/package.json ./packages/consts/package.json
COPY packages/types/package.json ./packages/types/package.json

RUN bun install --frozen-lockfile

# Workspace source needed by vite to bundle.
COPY apps/web ./apps/web
COPY packages ./packages

WORKDIR /app/apps/web
RUN bun run build

# Run nginx on the static build output.
FROM nginx:1.29.8-alpine AS runner
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
