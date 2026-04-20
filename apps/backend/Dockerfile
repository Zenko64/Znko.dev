FROM oven/bun:latest
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg libsvtav1-enc0 tini \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/consts/package.json ./packages/consts/package.json
COPY packages/types/package.json ./packages/types/package.json

RUN bun install --frozen-lockfile

# Workspace source.
COPY apps/backend ./apps/backend
COPY packages ./packages

WORKDIR /app/apps/backend

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000

# Persistent data lives here — mount a volume on this path.
RUN mkdir -p data/uploads data/queueData
VOLUME ["/app/apps/backend/data"]

EXPOSE 4000

# Tini is used to handle signals
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bun", "src/index.ts"]
