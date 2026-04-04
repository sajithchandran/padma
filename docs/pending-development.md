# Padma — Pending Development Backlog

> **Last updated:** 2026-04-03
> **Backend completion:** ~85% (core clinical workflows production-ready)
> **Frontend completion:** 0% (not started)

This document captures everything that is **not yet implemented** across the Padma platform — backend gaps, frontend, infrastructure, testing, and integrations. Items are grouped by priority.

---

## Table of Contents

1. [Backend — Critical (Must before production)](#1-backend--critical)
2. [Backend — Missing Modules](#2-backend--missing-modules)
3. [Backend — Stub Integrations](#3-backend--stub-integrations)
4. [Frontend — Not Started](#4-frontend--not-started)
5. [Testing — None exists yet](#5-testing)
6. [Infrastructure & DevOps](#6-infrastructure--devops)
7. [Feature Requirements Coverage](#7-feature-requirements-coverage)
8. [Technical Debt](#8-technical-debt)
9. [Implementation Sequence](#9-recommended-implementation-sequence)

---

## 1. Backend — Critical

These block production deployment.

### 1.1 JWT Authentication Guard

**File to create:** `src/common/guards/jwt-auth.guard.ts`

**Problem:** `TenantMiddleware` currently trusts `x-tenant-id`, `x-user-id`, `x-user-roles` headers in dev mode. In production mode it decodes the JWT payload but signature verification is left to the guard. Without this guard applied globally, unauthenticated requests can reach protected routes.

**What to implement:**
- Extract `Authorization: Bearer <token>` header
- Verify RS256 signature using `JWT_PUBLIC_KEY` from config
- Validate `iss` claim matches `JWT_ISSUER`
- Validate `exp` — reject expired tokens
- On success, attach `oidcSub` to request for TenantMiddleware to use
- Return `401 Unauthorized` on any failure

**Apply globally in `main.ts`:**
```typescript
app.useGlobalGuards(new JwtAuthGuard(configService));
```

**Exclude paths:** `health`, `webhooks/(.*)` (these use HMAC verification instead)

**Env vars already in `.env.example`:**
```
JWT_PUBLIC_KEY=
JWT_ISSUER=
```

---

### 1.2 Redis Service / Cache Module

**Problem:** `ioredis` is listed as a dependency and is referenced in `TenantMiddleware` (for caching permissions lookups) but no `RedisService` or `CacheModule` is wired up as a NestJS provider. Any code that calls Redis will throw at runtime.

**What to implement:**
- `src/cache/redis.service.ts` — wrapper around `ioredis` with `get`, `set`, `del`, `setEx`
- `src/cache/cache.module.ts` — `@Global()` module providing `RedisService`
- Register in `app.module.ts`
- Use in `TenantMiddleware` to cache `rbac:{userId}:{tenantId}` with 5-min TTL (avoid DB hit on every request)

**Env vars already in `.env.example`:**
```
REDIS_HOST=localhost
REDIS_PORT=6380
```

---

## 2. Backend — Missing Modules

### 2.1 Realtime / SSE Module

**Functional Requirement:** FR-4 — Coordinator dashboard updates in real-time when task status changes, a new enrollment is created, or a stage transition is proposed.

**Directory to create:** `src/realtime/`

**Files needed:**
- `realtime.module.ts`
- `realtime.service.ts` — subscribes to Redis Pub/Sub channels, fans out to SSE clients
- `realtime.controller.ts` — `GET /realtime/events` SSE endpoint (NestJS `@Sse()`)

**Events to publish (from other services):**
| Event channel | Trigger |
|---|---|
| `task:updated:{tenantId}` | Task status change (complete, skip, escalate) |
| `enrollment:created:{tenantId}` | New patient enrolled |
| `transition:proposed:{tenantId}` | Manual transition proposed, awaiting approval |
| `escalation:triggered:{tenantId}` | Escalation rule fired |

**Integration points:**
- `TasksService` → publish `task:updated` after status change
- `EnrollmentService` → publish `enrollment:created`
- `TransitionEvaluatorService` → publish `transition:proposed`

**Frontend consumption:** EventSource API or `@microsoft/fetch-event-source`

---

### 2.2 Patient Segments Module

**Functional Requirement:** FR-11 — Group patients dynamically using condition-based rules, then apply bulk actions (bulk reminder, bulk escalation, cohort reporting).

**Directory to create:** `src/segments/`

**Files needed:**
- `segments.module.ts`
- `segments.service.ts`
- `segments.controller.ts`
- `segment-evaluator.service.ts`
- `dto/create-segment.dto.ts`

**Data model** (add to `schema-core.prisma`):
```prisma
model PatientSegment {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @map("tenant_id") @db.Uuid
  name         String   @db.VarChar(255)
  description  String?  @db.Text
  filterExpr   Json     @map("filter_expr") @db.JsonB
  // DSL: { and: [ { field: "enrollment.adherencePercent", op: "lt", value: 60 }, ... ] }
  isDynamic    Boolean  @default(true) @map("is_dynamic")
  // true = evaluated on-demand; false = static list
  lastEvaluatedAt DateTime? @map("last_evaluated_at") @db.Timestamptz(6)
  patientCount    Int?      @map("patient_count")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  createdBy    String   @map("created_by") @db.Uuid
  @@index([tenantId])
  @@map("patient_segments")
}
```

**Filter DSL fields to support:**
- `enrollment.adherencePercent` — numeric comparison
- `enrollment.currentStageCode` — string eq/in
- `enrollment.status` — active | paused | completed
- `enrollment.pathwayCategory` — diabetes | hypertension | cardiac ...
- `enrollment.daysInCurrentStage` — numeric
- `lab_result.latest_hba1c` — numeric
- `lab_result.latest_bp_systolic` — numeric
- `patient.age` — numeric (requires DOB from Athma)
- `task.overdueCount` — numeric

**Bulk actions:**
- `POST /segments/:id/actions/send-reminder` — Enqueue `SEND_REMINDER` for all matching patients
- `POST /segments/:id/actions/escalate` — Force escalation for matching patients
- `GET /segments/:id/patients` — Preview matching patient list

---

### 2.3 Auto-Completion Module (Refactor)

**Current state:** Auto-completion logic is embedded inline in `src/integrations/athma/athma-webhook-handler.service.ts`. It works but is tightly coupled to Athma.

**What to refactor:** Extract into `src/auto-completion/` so other sources (device readings, self-reports, future integrations) can trigger auto-completion through a unified interface.

**Files needed:**
- `src/auto-completion/auto-completion.service.ts`
- `src/auto-completion/auto-completion.module.ts`

**Interface:**
```typescript
autoComplete(params: {
  tenantId: string;
  patientId: string;
  eventType: string;        // e.g. "appointment.completed"
  source: string;           // e.g. "athma"
  sourceEventId: string;    // idempotency
  payload: Record<string, unknown>;
}): Promise<{ completedTaskIds: string[] }>
```

---

## 3. Backend — Stub Integrations

These integrations are skeleton/stub clients. Business logic that calls them fails silently (caught errors) or does nothing.

### 3.1 Genesys Integration

**File:** `src/integrations/genesys/genesys.client.ts`

**Used by:** `EscalationService` for `schedule_call` escalation chain step

**What to implement:**
- OAuth 2.0 client credentials flow for Genesys Cloud API
- `scheduleOutboundCall(patientPhone, coordinatorId, scheduleAt, notes)` — POST to Genesys Outbound API
- `cancelCall(callId)` — cancel a previously scheduled call
- Error handling with retry (3 attempts, exponential backoff)

**Env vars to add:**
```
GENESYS_BASE_URL=
GENESYS_CLIENT_ID=
GENESYS_CLIENT_SECRET=
GENESYS_QUEUE_ID=
```

---

### 3.2 Medha Integration

**File:** `src/integrations/medha/medha.client.ts`

**Functional Requirement:** FR-13 — Push adherence metrics, task completion rates, and pathway progression data to Medha for analytics dashboards.

**What to implement:**
- `pushAdherenceMetrics(tenantId, patientId, metrics)` — POST batch metrics to Medha
- `pushPathwayEvent(event)` — stream pathway stage transitions as events
- Called from `EnrollmentService` on stage transition and from a nightly cron job

**Env vars to add:**
```
MEDHA_BASE_URL=
MEDHA_API_KEY=
```

---

### 3.3 Salesforce Integration

**File:** `src/integrations/salesforce/salesforce.client.ts`

**Used by:** `CommunicationService` — logs every sent message to Salesforce as an Activity record

**What to implement:**
- OAuth 2.0 connected app flow (username-password or client credentials)
- `logActivity(patientSfId, subject, description, channel, sentAt)` — create Salesforce Task/Activity
- Token caching (access token expires in 2h — cache in Redis)

**Env vars to add:**
```
SALESFORCE_INSTANCE_URL=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
SALESFORCE_USERNAME=
SALESFORCE_PASSWORD=
```

---

### 3.4 Zeal Integration

**File:** `src/integrations/zeal/zeal.client.ts`

**Purpose:** Share patient context between Padma and Zeal (sibling platform). Sync care plan summaries into Zeal's patient record.

**What to implement:**
- `getPatientContext(patientId)` — fetch shared context from Zeal
- `pushCarePlanSummary(patientId, summary)` — push pathway enrollment summary to Zeal

**Env vars to add:**
```
ZEAL_BASE_URL=
ZEAL_API_KEY=
```

---

## 4. Frontend — Not Started

**Technology:** Next.js 14 (App Router), React 18, shadcn/ui, Tailwind CSS, TanStack Query, Zustand

**Directory to create:** `/Users/sajithchandran/aira/padma/frontend/`

### 4.1 Pages & Screens

| Screen | Route | Description |
|---|---|---|
| Login / SSO redirect | `/login` | OIDC redirect to tenant IdP |
| Dashboard | `/dashboard` | Coordinator overview — overdue tasks, upcoming tasks, adherence stats |
| Patient List | `/patients` | Paginated, searchable, filterable list of enrolled patients |
| Patient 360 | `/patients/:id` | Full patient view — current stage, tasks, history, messages |
| Care Tasks | `/tasks` | My tasks view — filter by status, due date, priority |
| Clinical Pathways | `/pathways` | Pathway library — list, search |
| Pathway Builder | `/pathways/:id/edit` | Drag-and-drop stage + intervention editor |
| Enroll Patient | `/patients/:id/enroll` | Select pathway, set care team, initial clinical data |
| Escalation Rules | `/settings/escalation` | Create and manage escalation rule chains |
| Templates | `/settings/templates` | Communication template management |
| Users & Roles | `/settings/users` | Invite users, assign roles |
| Tenant Settings | `/settings/tenant` | Org profile, feature flags, OIDC config |
| Segments | `/segments` | Create/manage patient cohorts, run bulk actions |
| Roles & Permissions | `/settings/roles` | Custom role builder with permission matrix |

### 4.2 Component Library

- Pathway stage timeline component (horizontal stepper showing current stage)
- Task card component (status badge, due date, priority indicator, actions)
- Adherence ring chart (per-patient circular progress)
- Condition DSL builder UI (drag-and-drop condition nodes for transitions/escalation)
- Real-time notification bell (SSE feed from backend)
- Consent banner (display and capture patient consent)

### 4.3 State Management

- `usePatientStore` (Zustand) — currently viewed patient context
- `useTenantStore` (Zustand) — current tenant + feature flags
- `useAuthStore` (Zustand) — current user + role + permissions
- TanStack Query for all server state (tasks, enrollments, pathways)

### 4.4 Auth Flow

- OIDC redirect → receive JWT → store in httpOnly cookie
- Axios/fetch interceptor attaches `Authorization: Bearer <token>` + `x-tenant-id` header on every request
- Token refresh via silent iframe or refresh_token grant

---

## 5. Testing

**Current state:** Zero test files exist. `jest` and `ts-jest` are installed but unused.

### 5.1 Unit Tests (High Priority)

| File to test | What to test |
|---|---|
| `condition-evaluator.service.ts` | All operators (eq, gt, in, contains, exists, not), compound and/or/not, unknown operator returns false, nested conditions |
| `task-generator.service.ts` | once, daily, weekly, monthly recurrence; care setting filter; duplicate prevention; 30-day window boundary |
| `transition-evaluator.service.ts` | Auto vs manual transitions; condition evaluation in context; transaction atomicity |
| `jobs.service.ts` | Enqueue with idempotency; dequeue FOR UPDATE SKIP LOCKED; exponential backoff on fail |
| `reminder-scheduler.service.ts` | Adaptive reminder strategy (>3 days, 1-3 days, overdue); duplicate prevention |
| `escalation.service.ts` | Rule matching; chain step execution; level advancement |
| `communication.service.ts` | Opt-out gate; DND gate; quiet hours gate; consent gate; Mustache rendering |
| `privacy.service.ts` | DSAR export completeness; erasure anonymization; healthcare Art.17(3)(c) data retention |

### 5.2 Integration Tests

- Enroll patient → tasks generated for current stage → assert task count and due dates
- Lab result webhook → clinical data updated → transition evaluation fired → transition executed → new stage tasks generated
- Communication send → consent check → message persisted → provider call made → status updated to `sent`
- GDPR erasure → PII fields nulled in enrollments and tasks → preferences/messages/consents deleted

### 5.3 E2E Tests

- Full diabetes pathway: Enroll → Assessment → HbA1c lab result → Transition to Treatment → Task auto-complete on prescription dispensed → Reminder fired → Graduation
- Escalation chain: Task overdue 3 days → escalation rule fires → send_reminder → notify_coordinator → schedule_call (Genesys)

---

## 6. Infrastructure & DevOps

### 6.1 Dockerfile for Backend Service

**File to create:** `backend/services/care-coordination/Dockerfile`

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
EXPOSE 3020
CMD ["node", "dist/main"]
```

### 6.2 Health Check Endpoint

**File to create:** `src/health/health.controller.ts`

```typescript
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

Also add deep health check (DB ping, Redis ping) using `@nestjs/terminus`.

### 6.3 Logging & Observability

- Structured JSON logs already configured via `nestjs-pino` ✅
- **Missing:** Log shipping to a centralised log aggregator (Loki / CloudWatch / Datadog)
- **Missing:** APM / distributed tracing (OpenTelemetry setup)
- **Missing:** Metrics endpoint (`/metrics` in Prometheus format)

### 6.4 CI/CD Pipeline

- GitHub Actions workflow for: lint → type-check → test → build → push Docker image
- Prisma migration step in deployment pipeline (`prisma migrate deploy`)
- Staging environment auto-deploy on `main` branch merge
- Production deploy gated by manual approval

---

## 7. Feature Requirements Coverage

| FR | Feature | Module | Status | Notes |
|---|---|---|---|---|
| FR-1 | Clinical pathway CRUD with stage interventions | pathways | ✅ Done | |
| FR-2 | Care task generation, CRUD, self-serve completion | tasks | ✅ Done | |
| FR-3 | Adaptive reminder strategy (WhatsApp/SMS/Email) | reminders, communication | ✅ Done | |
| FR-4 | Real-time dashboard updates (SSE) | realtime | ❌ Not started | Redis + SSE module needed |
| FR-5 | Auto-complete tasks on Athma webhook events | integrations/athma | ✅ Done | |
| FR-6 | Coordinator dashboard (metrics, overdue, upcoming) | dashboard | ✅ Done | |
| FR-7 | Patient 360 view (tasks, history, stage) | tasks, enrollment | ✅ Done | |
| FR-8 | Self-serve task completion (patient-facing) | tasks | ✅ Done | Frontend not started |
| FR-9 | Multi-channel communication with consent gating | communication, privacy | ✅ Done | |
| FR-10 | Escalation rules + chain execution | escalation | ✅ Done | |
| FR-11 | Patient segmentation + bulk actions | segments | ❌ Not started | Module missing |
| FR-12 | Chat support / Genesys call scheduling | integrations/genesys | ⚠️ Stub | HTTP client not implemented |
| FR-13 | Adherence metrics push to Medha | integrations/medha | ⚠️ Stub | HTTP client not implemented |
| FR-14 | Pathway configuration UI | pathways + frontend | ⚠️ API done | Frontend not started |
| FR-15 | Integrations (Athma full, rest partial) | integrations | ⚠️ Partial | Athma complete; Salesforce/Genesys/Medha are stubs |

---

## 8. Technical Debt

| Item | Location | Impact | Notes |
|---|---|---|---|
| `prisma.seed` deprecation warning | `package.json` | Low | Migrate to `prisma.config.ts` when upgrading to Prisma 7 |
| `@db.Uuid` type annotations | All models | Low | Prisma 6 — review when upgrading |
| Header-based auth fallback | `TenantMiddleware` | High | Dev-only — must be removed / guarded before production |
| Inline auto-complete logic | `athma-webhook-handler.service.ts` | Medium | Refactor into `AutoCompletionModule` for extensibility |
| `any` type casts | Various service files | Low | Replace `as any` with proper typed casts |
| No pagination on segment evaluation | Future segments module | Medium | Large tenants (10K+ patients) need cursor-based pagination |
| No connection pooling config | `prisma-core.service.ts` | Medium | Add `connection_limit` and `pool_timeout` to DATABASE_URL for production |

---

## 9. Recommended Implementation Sequence

### Phase A — Unblock Production (2–3 weeks)
1. JWT Auth Guard (`src/common/guards/jwt-auth.guard.ts`)
2. Redis Service / Cache Module (`src/cache/`)
3. Health check endpoint (`src/health/`)
4. Dockerfile + production docker-compose
5. Unit tests for core engine files (condition evaluator, task generator)

### Phase B — Complete Platform Features (4–6 weeks)
6. Realtime / SSE Module (`src/realtime/`)
7. Patient Segments Module (`src/segments/`) + schema migration
8. Genesys Client (full HTTP implementation)
9. Medha Client (metrics push)
10. Integration tests (webhook → task auto-complete → transition flow)

### Phase C — Frontend (6–8 weeks)
11. Next.js 14 project scaffold with auth (OIDC) + layout
12. Dashboard + Patient List + Patient 360
13. Task management screens
14. Pathway Builder (stage + intervention editor)
15. Settings screens (users, roles, templates, escalation)

### Phase D — Polish & GA (2–3 weeks)
16. Salesforce + Zeal integration clients
17. E2E tests (full pathway lifecycle)
18. CI/CD pipeline (GitHub Actions)
19. Load testing (job queue, reminder scheduler, dashboard aggregations)
20. API documentation review (Swagger decorators on all endpoints)
