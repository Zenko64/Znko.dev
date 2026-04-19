![znko.dev banner](assets/img/banner.png)

# znko.dev

Personal content platform for sharing **games**, **videos**, and **posts**, with rich-text composition, file staging, and a live Discord-presence widget.

## Stack

| Layer        | Tech                                                         |
| ------------ | ------------------------------------------------------------ |
| Runtime      | [Bun](https://bun.sh) 1.3                                     |
| API          | [Hono](https://hono.dev) on top of `Bun.serve`                |
| Database     | PostgreSQL 18 + [Drizzle ORM](https://orm.drizzle.team)       |
| Cache / queue| Redis 8 + [BullMQ](https://docs.bullmq.io) (via `bunqueue`)   |
| Auth         | OpenID Connect (`openid-client`) + Redis-backed sessions     |
| Frontend     | React 19, Vite, TanStack Query v5, React Hook Form, Zod      |
| Styling      | Tailwind v4 + shadcn/ui                                       |
| Media        | `sharp` for images, system `ffmpeg` for video transcoding    |

## Repository layout

```
znko.dev/
├── apps/
│   ├── backend/         # Hono API on Bun
│   └── web/             # React + Vite SPA
├── packages/
│   ├── consts/          # Shared API route constants
│   └── types/           # Shared Zod schemas + inferred TS types
├── docker-compose.yml   # Local-server deploy: postgres + redis + backend + web
├── .env.example         # Copy to .env and fill in
└── turbo.json           # Pipeline config
```

## Local development

Prerequisites: **Bun 1.3+**, a running **PostgreSQL** and **Redis**, an **OIDC provider**.

```bash
bun install
cp .env.example apps/backend/.env   # backend reads from apps/backend/.env in dev

bun run db:push                     # sync Drizzle schema to your local DB
bun run dev                         # turbo runs both apps in parallel
```

- API: <http://localhost:4000>
- SPA: <http://localhost:5173> (Vite proxies `/api` to the backend)

### Useful scripts

| Command                | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `bun run dev`          | Run all apps in watch mode via Turbo                  |
| `bun run build`        | Type-check everything                                 |
| `bun run lint`         | Run ESLint across workspaces                          |
| `bun run db:generate`  | Generate a new Drizzle migration                      |
| `bun run db:migrate`   | Apply pending migrations                              |
| `bun run db:push`      | Push the schema directly (dev only)                   |

## Deployment — local server with Docker Compose

The compose stack brings up four services:

| Service    | Image / build              | Purpose                                     |
| ---------- | -------------------------- | ------------------------------------------- |
| `postgres` | `postgres:18.3-alpine`     | Application database                        |
| `redis`    | `redis:8.4.2-alpine`       | Sessions + queue + rate-limit state         |
| `backend`  | `apps/backend/Dockerfile`  | Bun API; `ffmpeg` baked in; volume `data/`  |
| `web`      | `apps/web/Dockerfile`      | nginx serving the built SPA + reverse proxy |

The `web` container reverse-proxies `/api` to `backend:4000` so the SPA and API share an origin (no CORS surprises in production). Static uploads are served by the backend under `/api/uploads/...`, so they ride the same proxy.

### One-time setup

```bash
cp .env.example .env
# Edit .env — fill in:
#   APP_URL  (must match the URL the browser hits, e.g. http://192.168.1.10:8080)
#   SESSION_SECRET   →  openssl rand -hex 32
#   OIDC_*  (issuer + client id/secret from your IdP)
```

Make sure your OIDC provider has **`<APP_URL>/api/auth/callback`** registered as an allowed redirect URI.

### Bring it up

```bash
docker compose up -d --build
```

Then open `http://<server-ip>:8080`. Logs:

```bash
docker compose logs -f backend
```

### Apply database migrations

The backend container does **not** auto-migrate. Run migrations once after the first boot (or after pulling new schema changes):

```bash
docker compose exec backend bun run db:push       # dev / hackathon
# or, for tracked migrations:
docker compose exec backend bun run db:migrate
```

### Persistent data

Three named volumes survive `down`/`up` cycles:

| Volume          | Holds                                              |
| --------------- | -------------------------------------------------- |
| `postgres-data` | Postgres data directory                            |
| `redis-data`    | Redis snapshots                                    |
| `backend-data`  | Uploaded files + bunqueue SQLite (`/app/apps/backend/data`) |

`docker compose down -v` deletes them. Don't.

### Updating

```bash
git pull
docker compose up -d --build
```

Vite-built assets are baked into the `web` image, so a rebuild is mandatory after frontend changes.

## Architecture notes

- **File staging.** Uploads land in a `temp_*` slot, get a Redis-tracked TTL, and are committed into `data/uploads/{feature}/{resourceId}/{category}-{uuid}.{ext}` only when the parent record is saved. Orphaned temps are swept by a scheduled job. See `apps/backend/src/core/storage.ts`.
- **Shared schemas.** Every API contract lives in `packages/types` (`shapes.api.request.*` / `shapes.api.response.*`). The frontend infers form/query types from these via `InferRequestType` from `hono/client` — never re-declare them.
- **Search.** All list endpoints accept a `?search=` query; the frontend uses a debounced `<SearchBar>` element (`apps/web/src/components/elements/SearchBar.tsx`) that emits only the debounced value to the parent.
- **Auth.** OIDC-only. Sessions are signed cookies referencing Redis-stored session blobs; no JWTs are minted client-side.
- **Presence.** A WebSocket connection to Lanyard is upgraded at `/api/presence` for the live-Discord-status widget.

## License

Private / unlicensed — personal project.
