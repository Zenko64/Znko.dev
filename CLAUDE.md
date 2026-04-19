# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Overview

This is a TypeScript monorepo using **npm workspaces** + **Turbo** for a personal content platform (games, videos, posts) at znko.dev. The backend runs on **Bun**.

**Workspaces:**
- `apps/backend` — Hono API (`@znko/backend`)
- `apps/web` — React 19 + Vite SPA (`@znko/web`)
- `packages/consts` — Shared API route constants (`@znko/consts`)
- `packages/types` — Shared Zod schemas and TypeScript types (`@znko/types`)

## Commands

### Root (run from repo root)
```bash
npm run dev        # Start all apps in parallel via Turbo
npm run build      # Build all apps
npm run lint       # Lint all apps

npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema to DB (dev only)
```

### Backend only (`apps/backend`)
```bash
npm run dev        # bun --watch src/index.ts
npm run start      # bun src/index.ts (production)
npm run build      # tsc --noEmit (type check)
npm run typecheck  # tsc --noEmit
```

### Frontend only (`apps/web`)
```bash
npm run dev        # vite dev server
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run preview    # vite preview
```

To run a single workspace command from root: `npm run --workspace=apps/backend <script>`

## Architecture

### Backend (`apps/backend/src/`)

Hono REST API with this layered structure:
- `routes/` — Route definitions (attach middleware, call services)
- `services/` — Business logic (queries DB, calls external APIs)
- `core/` — Infrastructure setup: `env.ts`, `server.ts`, `logging.ts` (Winston), `storage.ts`, `oidc.ts`, `redis.ts`, `session.ts`, `errors.ts`
- `db/schema.ts` — Single Drizzle ORM schema file for all tables; `db/index.ts` — DB connection
- `types/` — Hono type augmentation (`hono.ts`)
- `cli/` — CLI utilities
- `middleware/` — Auth and error handling middleware
- `functions/` — Utility functions (file handling)
- `security/` — Input sanitization utilities

**TypeScript path aliases** (defined in `tsconfig.json`):
- `#core/*` → `src/core/`
- `#db/*` → `src/db/`
- `#services/*` → `src/services/`
- `#routes/*` → `src/routes/`
- `#middleware/*` → `src/middleware/`
- `#security/*` → `src/security/`
- `#functions/*` → `src/functions/`
- `#types/*` → `src/types/`

**Database**: PostgreSQL via Drizzle ORM. Tables: `users`, `user_oidc_accounts`, `posts`, `post_media`, `games`, `game_media`, `videos`. Migrations live in `drizzle/`.

**Auth**: OIDC-based (OpenID Connect via `openid-client`). Sessions stored in Redis via `connect-redis`.

**File uploads**: Feature-based directory structure: `{UPLOADS_DIR}/{Feature}/{ResourceID}/{FileCategory}-UUID.EXT`. Features: `posts`, `games`, `users`, `videos`. Categories: `avatar`, `thumbnail`, `video`, `cover`, `hero`, `media`. Served statically from `/api/uploads`. Uploads directory is gitignored.

**Discord presence**: WebSocket integration via Lanyard API, exposed at `/api/presence`.

### Frontend (`apps/web/src/`)

React 19 SPA with React Router 7 for routing:
- `pages/` — Top-level route components
- `components/` — Organized by domain (`games/`, `videos/`, `posts/`, `profile/`) plus `ui/` (shadcn), `layout/`, `elements/`, `menus/`
  - **Do not edit `components/ui/`** — these are generated/downloaded shadcn components and will be overwritten on updates. Customise by wrapping them in `components/elements/` instead.
- `queries/` — TanStack Query hooks for all server data fetching
- `providers/` — `AuthProvider` (OIDC client), `ThemeProvider`
- `hooks/` — Custom hooks (e.g., `usePresence` for Discord WebSocket)
- `lib/queryClient.ts` — TanStack Query client configuration
- `utils/` — Shared helpers

**Path alias**: `@/*` → `src/`

**API proxy**: Vite dev server proxies `/api` and `/uploads` to `http://localhost:4000` (backend). WebSocket proxying enabled for `/api/presence`.

**Styling**: Tailwind CSS v4 with shadcn/ui components. shadcn config in `components.json` (style: base-lyra, color: neutral with CSS variables).

**Key libraries**:
- TanStack Query v5 for server state
- React Hook Form + Zod for forms
- Vidstack React for video playback
- Motion for animations
- Tiptap (root deps) for rich text editor in posts

### Shared Packages

**`packages/consts`**: Exports a `ROUTES` object with all API endpoint paths — import this instead of hardcoding strings in either app.

**`packages/types`**: Shared Zod schemas and inferred TypeScript types used by both backend and frontend for API contracts.
- `src/request.ts` — Zod schemas for API request bodies/form data (e.g. `game`, `post`, `video`)
- `src/response.ts` — Zod schemas for API response shapes
- `src/discord.ts` — Discord/Lanyard presence schemas
- All exported via `shapes` object: `shapes.api.request.*`, `shapes.api.response.*`, `shapes.discord.*`
- **Never redefine or duplicate these schemas inline.** Always import from `@znko/types`. When adding validation (frontend forms or backend routes), extend or compose from these schemas rather than creating new ones.

## Environment

Backend requires a `.env` file in `apps/backend/` with:
- `HOST`, `PORT` — API server (default port 4000)
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `SESSION_SECRET` — Session signing secret
- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` — OpenID Connect provider
- `APP_URL` — Frontend origin (for OIDC redirect)
- `DISCORD_USER_ID` — For Lanyard presence integration

## graphify

This project has a graphify knowledge graph at `graphify-out/`. Use it as a RAG layer before answering architecture or codebase questions.

**Rules:**
- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure
- If `graphify-out/obsidian/` exists, navigate community overview notes (`_COMMUNITY_*.md`) for structured context
- After modifying code files in this session, run:
  ```
  uv run --with graphifyy python -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"
  ```
  to keep the graph current
- To ask questions against the graph: `/graphify query "<question>"`
- To do a full rebuild after significant changes: `/graphify . Ignore Uploaded Files such as Videos`
