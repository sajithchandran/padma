# Padma — DevOps & Operations Guide

> **Last updated:** 2026-04-04
> **Stack:** NestJS 10 · Next.js 14 · PostgreSQL 16 · Redis 7 · Docker / Docker Compose

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [Prerequisites](#2-prerequisites)
3. [Environment Configuration](#3-environment-configuration)
4. [Running with Docker (Recommended)](#4-running-with-docker-recommended)
5. [Running without Docker (Local Development)](#5-running-without-docker-local-development)
6. [Database Management](#6-database-management)
7. [Build & Deployment](#7-build--deployment)
8. [Health Checks & Monitoring](#8-health-checks--monitoring)
9. [Logs & Debugging](#9-logs--debugging)
10. [Common Issues & Fixes](#10-common-issues--fixes)
11. [Port Reference](#11-port-reference)
12. [Service Dependency Map](#12-service-dependency-map)

---

## 1. Project Architecture

```
padma/
├── backend/                          ← npm workspace root for all backend services
│   ├── package.json                  ← workspace manifest  (workspaces: ["services/*"])
│   ├── package-lock.json             ← single unified lock file for all services
│   ├── node_modules/                 ← hoisted shared packages
│   └── services/
│       └── care-coordination/        ← NestJS API  (name: @padma/care-coordination)
│           ├── package.json
│           ├── node_modules/         ← service-specific packages + generated Prisma clients
│           ├── src/
│           ├── dist/                 ← compiled output (git-ignored)
│           ├── prisma/
│           │   ├── schema-core.prisma
│           │   └── schema-engagement.prisma
│           ├── Dockerfile
│           ├── docker-entrypoint.sh
│           └── .env.example
├── frontend/                         ← Next.js 14 (port 3000)
│   ├── package.json
│   ├── node_modules/
│   ├── src/
│   ├── Dockerfile
│   └── .env.local.example
├── docs/
├── pgadmin/
│   └── servers.json
├── init-scripts/                     ← PostgreSQL init SQL (runs once on first boot)
├── docker-compose.yml          ← Infrastructure only (Postgres, Redis, pgAdmin)
└── docker-compose.prod.yml     ← Full production stack (infra + backend + frontend)
```

### npm Workspace Layout

The backend uses **npm workspaces** rooted at `backend/`. This means:
- One `package-lock.json` governs all backend services
- Running `npm install` from `backend/` installs deps for every service under `services/`
- Adding a new service (e.g. `services/care-routing/`) requires only adding its `package.json` — no separate installs
- All workspace commands target a specific service via `--workspace=@padma/<service-name>`

### Service Communication

```
Browser
  │
  ├── :3000  ──→  Next.js Frontend (padma-frontend)
  │                 │
  │                 └── /api/* rewrites ──→  NestJS Backend (padma-backend) :3020
  │                                              │
  │                                              ├──→  PostgreSQL (padma-postgres) :5432 (internal)
  │                                              └──→  Redis (padma-redis) :6379 (internal)
  │
  ├── :3020  ──→  NestJS Backend (direct access / Swagger)
  ├── :8081  ──→  pgAdmin 4
  └── :5433  ──→  PostgreSQL (external, for GUI clients)
```

> **Note:** Inside the Docker network, services communicate by container name (`postgres`, `redis`, `backend`).
> External port mappings (5433, 6380, 8081) avoid conflicts with any locally-installed services.

---

## 2. Prerequisites

### For Docker mode (recommended)

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | ≥ 4.x | https://docs.docker.com/get-docker/ |
| Docker Compose | ≥ 2.x (bundled with Docker Desktop) | — |

### For local (no-Docker) mode

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x LTS | https://nodejs.org or `nvm install 20` |
| npm | ≥ 10.x | Bundled with Node.js |
| PostgreSQL | 16.x | https://www.postgresql.org/download/ |
| Redis | 7.x | https://redis.io/download |

### Verify your setup

```bash
docker --version          # Docker version 24.x.x
docker compose version    # Docker Compose version v2.x.x
node --version            # v20.x.x
npm --version             # 10.x.x
psql --version            # psql (PostgreSQL) 16.x
redis-cli --version       # Redis cli 7.x.x
```

---

## 3. Environment Configuration

### Backend — `backend/services/care-coordination/.env`

Copy the example and edit as needed:

```bash
cp backend/services/care-coordination/.env.example \
   backend/services/care-coordination/.env
```

| Variable | Dev value | Description |
|----------|-----------|-------------|
| `DATABASE_CORE_URL` | `postgresql://padma:padma_dev_secret@localhost:5433/padma_core?schema=public` | Core database (tenants, users, RBAC) |
| `DATABASE_ENGAGEMENT_URL` | `postgresql://padma:padma_dev_secret@localhost:5433/padma_engagement?schema=public` | Engagement database (pathways, tasks) |
| `REDIS_HOST` | `localhost` | Redis hostname (`redis` in Docker) |
| `REDIS_PORT` | `6380` | Redis port (`6379` internally in Docker) |
| `JWT_PUBLIC_KEY` | _(empty for dev)_ | OIDC public key for JWT verification |
| `JWT_ISSUER` | `https://auth.padma.local` | OIDC issuer URL |
| `PORT` | `3020` | API server port |
| `NODE_ENV` | `development` | Environment flag |
| `ATHMA_WEBHOOK_SECRET` | `dev-athma-webhook-secret` | Webhook HMAC secret |

> **Docker note:** When running in Docker, the backend uses container hostnames (`postgres`, `redis`) instead of `localhost`. These are set directly in `docker-compose.yml` and override `.env`.

### Frontend — `frontend/.env.local`

```bash
cp frontend/.env.local.example frontend/.env.local
```

| Variable | Dev value | Description |
|----------|-----------|-------------|
| `BACKEND_INTERNAL_URL` | `http://localhost:3020` | Backend URL for Next.js server-side proxy rewrites |
| `NEXT_PUBLIC_API_BASE` | `/api/v1` | Base path used by browser-side API calls |
| `NEXT_PUBLIC_OIDC_ISSUER` | `https://auth.padma.local` | OIDC issuer (future use) |
| `NEXT_PUBLIC_OIDC_CLIENT_ID` | `padma-frontend` | OIDC client ID (future use) |

---

## 4. Docker — Infrastructure for Local Development

During **local development**, only infrastructure services (Postgres, Redis, pgAdmin) run in Docker.
The backend and frontend run directly in your terminal for fast hot-reload.

All commands are run from the **project root** (`padma/`).

### 4.1 Start infrastructure (daily dev workflow)

```bash
# Start Postgres, Redis and pgAdmin in the background
docker compose up -d
```

That's it — your databases are ready. Now start the backend and frontend in separate terminals (see §5).

### 4.2 Stop infrastructure

```bash
# Stop containers (volumes / data preserved)
docker compose down

# Stop AND wipe all data  ⚠️ destructive — fresh DB on next start
docker compose down -v
```

### 4.3 Start/stop individual infra services

```bash
docker compose up -d postgres        # DB only
docker compose up -d redis           # Cache only
docker compose up -d pgadmin         # pgAdmin GUI only
docker compose stop postgres         # Stop one service
```

### 4.4 View infra status

```bash
docker compose ps
```

### 4.5 Access points (infra only)

| Service | URL / Host | Credentials |
|---------|-----------|-------------|
| PostgreSQL | `localhost:5433` | `padma / padma_dev_secret` |
| Redis | `localhost:6380` | _(no auth in dev)_ |
| pgAdmin | http://localhost:8081 | `admin@padma.dev / padma_admin` |

---

## 4b. Docker — Full Production Stack

The file `docker-compose.prod.yml` runs **everything** — infra + backend + frontend — as built Docker images.
Use this for staging / production deployments.

### Start the full stack

```bash
# Build images and start all services
docker compose -f docker-compose.prod.yml up --build -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop everything
docker compose -f docker-compose.prod.yml down
```

### Rebuild a single service

```bash
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d --no-deps backend
```

### Startup sequence (production)

Docker Compose enforces this order via `depends_on` with `condition: service_healthy`:

```
postgres ──healthy──→ redis ──healthy──→ backend ──healthy──→ frontend
                    ↘
                    pgadmin
```

The backend `docker-entrypoint.sh` auto-runs migrations before the server starts:

```sh
npx prisma migrate deploy --schema=prisma/schema-core.prisma
npx prisma migrate deploy --schema=prisma/schema-engagement.prisma
exec node dist/main
```

### Access points (production / full Docker)

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend UI | http://localhost:3000 | Demo login available |
| Backend API | http://localhost:3020 | Redirects to Swagger |
| Swagger / API Docs | http://localhost:3020/api/docs | — |
| pgAdmin 4 | http://localhost:8081 | `admin@padma.dev` / `padma_admin` |
| PostgreSQL (direct) | `localhost:5433` | `padma` / `padma_dev_secret` |
| Redis (direct) | `localhost:6380` | No auth in dev |

---

## 5. Local Development (Recommended daily workflow)

During development, **infrastructure runs in Docker** and **backend + frontend run in your terminal**.
This gives you fast hot-reload without rebuilding Docker images.

### 5.1 Start infrastructure (once per day)

```bash
# From project root
docker compose up -d
```

This starts Postgres (`localhost:5433`), Redis (`localhost:6380`) and pgAdmin (`localhost:8081`).
Leave it running in the background — volumes preserve your data between restarts.

### 5.2 Start the Backend (NestJS) — via npm Workspace

All backend commands run from the **`backend/`** workspace root, targeting a service with `--workspace`:

```bash
cd backend

# ── First-time setup ──────────────────────────────────────────────────────
# Install all service dependencies (creates backend/node_modules and per-service ones)
npm install

# Generate Prisma clients  (re-run after schema changes)
npm run generate

# Run database migrations
npm run migrate:dev

# Seed the database with demo data (first time only)
npm run seed

# ── Day-to-day development ────────────────────────────────────────────────
# Start with hot-reload (watch mode)
npm run dev

# Or target the service directly (equivalent):
npm run start:dev --workspace=@padma/care-coordination
```

Backend will be available at **http://localhost:3020**

> **Adding a new service** (e.g. `care-routing`):
> 1. Create `backend/services/care-routing/package.json` with `"name": "@padma/care-routing"`
> 2. Run `npm install` from `backend/` — it picks up the new workspace automatically
> 3. Add a convenience script in `backend/package.json` targeting the new workspace

### 5.3 Start the Frontend (Next.js)

Open a new terminal:

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start in development mode (HMR enabled)
npm run dev
```

Frontend will be available at **http://localhost:3000**

### 5.4 Stop local services

```bash
# Kill the backend (Ctrl+C in its terminal, or:)
kill $(lsof -ti:3020)

# Kill the frontend (Ctrl+C in its terminal, or:)
kill $(lsof -ti:3000)

# Stop Docker infra (keeps volumes — data is safe)
docker compose down
```

### 5.5 Access points (local dev mode)

| Service | URL / Host | Notes |
|---------|-----------|-------|
| Frontend (HMR) | http://localhost:3000 | Next.js dev server |
| Backend API | http://localhost:3020 | NestJS watch mode |
| Swagger / API Docs | http://localhost:3020/api/docs | — |
| pgAdmin 4 | http://localhost:8081 | Docker infra |
| PostgreSQL | `localhost:5433` | Docker infra (maps to container :5432) |
| Redis | `localhost:6380` | Docker infra (maps to container :6379) |

---

## 6. Database Management

### 6.1 Prisma schemas

The project uses **two separate Prisma schemas**:

| Schema | Database | Purpose |
|--------|----------|---------|
| `prisma/schema-core.prisma` | `padma_core` | Tenants, Users, RBAC, Roles, Permissions |
| `prisma/schema-engagement.prisma` | `padma_engagement` | Pathways, Tasks, Enrollment, Communications |

### 6.2 Run migrations

```bash
cd backend/services/care-coordination

# Development (creates migration files, applies immediately)
npx prisma migrate dev --schema=prisma/schema-core.prisma --name <migration_name>
npx prisma migrate dev --schema=prisma/schema-engagement.prisma --name <migration_name>

# Production (apply existing migration files only — no new files created)
npx prisma migrate deploy --schema=prisma/schema-core.prisma
npx prisma migrate deploy --schema=prisma/schema-engagement.prisma
```

### 6.3 Generate Prisma clients

Must be re-run after any schema change:

```bash
cd backend/services/care-coordination
npm run prisma:generate
# equivalent to:
# npx prisma generate --schema=prisma/schema-core.prisma
# npx prisma generate --schema=prisma/schema-engagement.prisma
```

### 6.4 Seed demo data

```bash
cd backend/services/care-coordination
npx ts-node prisma/seed-core.ts
```

Seeded records:
- **23 permissions** (resource:action format)
- **6 system roles:** admin, supervisor, care_coordinator, physician, nurse, viewer
- **Demo tenant:** `demo-healthcare` (ID: `634f313f-9120-4223-8966-e4e3121a1f69`)
- **Admin user:** `admin@padma.dev` (ID: `7286505d-6cd5-4cd7-93af-eae66daf12b1`)

### 6.5 Reset the database

```bash
# ⚠️ Destructive — wipes ALL data and re-runs migrations
cd backend/services/care-coordination
npx prisma migrate reset --schema=prisma/schema-core.prisma
npx prisma migrate reset --schema=prisma/schema-engagement.prisma
```

### 6.6 Open Prisma Studio (GUI)

```bash
cd backend/services/care-coordination

# Core schema
npx prisma studio --schema=prisma/schema-core.prisma      # http://localhost:5555

# Engagement schema (open in another terminal on a different port)
npx prisma studio --schema=prisma/schema-engagement.prisma --port 5556
```

### 6.7 Connect with psql

```bash
# Via Docker container
docker exec -it padma-postgres psql -U padma -d padma_core

# Via local psql (Docker-mapped port)
psql postgresql://padma:padma_dev_secret@localhost:5433/padma_core
```

---

## 7. Build & Deployment

### 7.1 Build backend for production

```bash
cd backend/services/care-coordination
npm run build
# Outputs compiled JS to: dist/
# Entry point: dist/main.js
```

### 7.2 Build frontend for production

```bash
cd frontend
npm run build
# Next.js standalone output at: .next/standalone/
```

### 7.3 Build Docker images

```bash
# From project root — build all images
docker compose build

# Build specific service
docker compose build backend
docker compose build frontend

# Build with no cache (force clean build)
docker compose build --no-cache backend
```

### 7.4 Type checking

```bash
# Backend
cd backend/services/care-coordination && npx tsc --noEmit

# Frontend
cd frontend && npm run type-check
```

### 7.5 Linting

```bash
# Backend
cd backend/services/care-coordination && npm run lint

# Frontend
cd frontend && npm run lint
```

---

## 8. Health Checks & Monitoring

### 8.1 Service health endpoints

| Endpoint | Expected response |
|----------|-------------------|
| `GET http://localhost:3020/` | `302` redirect to `/api/docs` |
| `GET http://localhost:3020/api/v1/health` | `200 { status: "ok", service: "padma-care-coordination", timestamp: "..." }` |

### 8.2 Check Docker container health

```bash
# View health status of all containers
docker compose ps

# Inspect detailed health check output for a specific container
docker inspect padma-backend --format='{{json .State.Health}}' | python3 -m json.tool

# Watch health status in real time
watch -n 2 'docker compose ps'
```

### 8.3 Verify connectivity

```bash
# Backend API health
curl http://localhost:3020/api/v1/health

# PostgreSQL connectivity
docker exec padma-postgres pg_isready -U padma

# Redis connectivity
docker exec padma-redis redis-cli ping   # should return PONG
```

---

## 9. Logs & Debugging

### 9.1 View Docker logs

```bash
# All services (follow mode)
docker compose logs -f

# Single service (follow mode)
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis

# Last N lines
docker compose logs --tail=100 backend

# Since a specific time
docker compose logs --since="2026-04-04T10:00:00" backend
```

### 9.2 Open a shell inside a container

```bash
# Backend container
docker exec -it padma-backend sh

# Postgres container
docker exec -it padma-postgres sh

# Redis container
docker exec -it padma-redis sh
```

### 9.3 Local dev server logs

The NestJS backend (in `start:dev` mode) outputs structured logs with:
- Request method, path, status code, response time
- Database query counts (in debug mode)
- Audit events (from `AuditLogInterceptor`)

The Next.js frontend dev server outputs:
- HMR compilation times
- Route compile times (first request)
- API rewrite proxy hits

### 9.4 Enable debug mode (backend)

```bash
cd backend/services/care-coordination
npm run start:debug
# Exposes Node.js inspector on port 9229
# Attach via Chrome DevTools: chrome://inspect
```

---

## 10. Common Issues & Fixes

### Port already in use

```bash
# Find and kill the process using a port
lsof -ti:3020 | xargs kill -9   # backend
lsof -ti:3000 | xargs kill -9   # frontend
lsof -ti:5433 | xargs kill -9   # postgres (mapped)
```

### Docker credential error (`docker-credential-desktop not found`)

```bash
# Remove the credsStore key from Docker config
cat ~/.docker/config.json
# Edit the file and remove: "credsStore": "desktop"
```

### `Cannot GET /` on backend root

The backend sets `api/v1` as a global prefix. The root `/` now redirects to `/api/docs`. If you see this error, ensure the backend was rebuilt after the `main.ts` update:

```bash
docker compose build --no-cache backend && docker compose up -d backend
```

### Prisma client import errors in compiled output

All Prisma imports must use Node.js module resolution, **not** relative paths:

```typescript
// ✅ Correct
import { PrismaClient } from '.prisma/client-core';

// ❌ Wrong — breaks in compiled dist/
import { PrismaClient } from '../../node_modules/.prisma/client-core';
```

### pgAdmin `chmod: /pgpass: Read-only file system`

Remove any custom entrypoint or `/pgpass` volume mount from `docker-compose.yml`. The password should be embedded directly in `pgadmin/servers.json`.

### pgAdmin shows duplicate servers

Check `pgadmin/servers.json` — there should be exactly one server entry pointing to `postgres:5432`.

### Backend health check failing (container stuck in `starting`)

Verify the healthcheck URL matches the actual route (with global prefix):

```yaml
# docker-compose.yml
healthcheck:
  test: ['CMD-SHELL', 'wget -qO- http://localhost:3020/api/v1/health || exit 1']
```

### Frontend not loading (depends on backend being healthy)

The frontend container has `depends_on: backend: condition: service_healthy`. If the backend health check is failing, the frontend will not start. Fix the backend first.

### Next.js builds outputting to `dist/src/main.js` instead of `dist/main.js`

Ensure `tsconfig.build.json` uses `include` (not `rootDir`) to control output:

```json
{
  "include": ["src/**/*"],
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts", "prisma/**/*"]
}
```

### Database migration fails on startup

If migrations fail in the entrypoint, check:
1. PostgreSQL is healthy before the backend starts (`depends_on: condition: service_healthy`)
2. The migration files exist in `prisma/migrations/`
3. The `DATABASE_CORE_URL` / `DATABASE_ENGAGEMENT_URL` are correct for the Docker network

```bash
# Check migration status manually inside the container
docker exec -it padma-backend sh
npx prisma migrate status --schema=prisma/schema-core.prisma
```

---

## 11. Port Reference

| Port (External) | Port (Internal) | Service | Protocol |
|----------------|----------------|---------|----------|
| `3000` | `3000` | Next.js Frontend | HTTP |
| `3020` | `3020` | NestJS Backend API | HTTP |
| `5433` | `5432` | PostgreSQL | TCP |
| `6380` | `6379` | Redis | TCP |
| `8081` | `80` | pgAdmin 4 | HTTP |

> External ports are offset (`5433`, `6380`) to avoid conflicts with locally-installed PostgreSQL (`5432`) and Redis (`6379`).

---

## 12. Service Dependency Map

```
                    ┌─────────────────────────────────────┐
                    │         docker-compose.yml           │
                    └─────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼──────────────────────────┐
          │                           │                          │
     ┌────▼────┐                ┌─────▼─────┐              ┌────▼────┐
     │postgres │                │   redis   │              │pgadmin  │
     │  :5432  │                │  :6379    │              │  :80    │
     └────┬────┘                └─────┬─────┘              └─────────┘
          │ healthy                   │ healthy
          └─────────┬─────────────────┘
                    │
               ┌────▼────┐
               │ backend │  runs migrations on startup
               │  :3020  │  → /api/v1/health
               └────┬────┘
                    │ healthy
               ┌────▼────┐
               │frontend │
               │  :3000  │  proxies /api/* → backend:3020
               └─────────┘
```

### Quick-reference cheat sheet

```bash
# ── Docker ────────────────────────────────────────────────────────────
docker compose up --build -d          # Start everything (build first)
docker compose up -d                  # Start everything (no rebuild)
docker compose stop                   # Stop all (keep data)
docker compose down                   # Remove containers (keep data)
docker compose down -v                # ⚠️ Remove containers + wipe data
docker compose restart backend        # Restart one service
docker compose logs -f backend        # Follow logs
docker compose ps                     # Status of all services

# ── Local dev — Backend (run from backend/) ───────────────────────────
npm install                                        # Install all workspace deps
npm run dev                                        # Start care-coordination HMR
npm run dev --workspace=@padma/care-coordination   # Explicit workspace target
npm run build                                      # Compile TypeScript
npm run test                                       # Run unit tests
npm run lint                                       # Lint all services

# ── Local dev — Frontend (run from frontend/) ─────────────────────────
npm install && npm run dev             # Install + start Next.js HMR

# ── Database (run from backend/) ──────────────────────────────────────
npm run generate                       # Regenerate both Prisma clients
npm run migrate:dev                    # Create + apply migrations (dev)
npm run migrate:prod                   # Apply existing migrations (prod)
npm run seed                           # Seed demo data
npm run prisma:studio:core --workspace=@padma/care-coordination   # GUI :5555
npm run prisma:studio:eng  --workspace=@padma/care-coordination   # GUI :5556

# ── Health checks ─────────────────────────────────────────────────────
curl http://localhost:3020/api/v1/health
docker exec padma-redis redis-cli ping
docker exec padma-postgres pg_isready -U padma
```
