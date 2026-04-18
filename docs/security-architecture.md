# Padma — Security Architecture and Implementation

> **Last updated:** 2026-04-18
> **Scope:** Backend API, frontend API client, tenant context, RBAC, privacy, webhooks, and operational security controls.

---

## 1. Security Goals

Padma handles clinical workflow, patient communication, care-team activity, and privacy consent data. The security model is designed around:

- Verified identity on every protected API request
- Tenant isolation driven by trusted JWT claims and database membership
- Role-based access at controller and query levels
- Strict request validation to reduce injection and mass-assignment risk
- Auditability for patient, task, pathway, privacy, and communication workflows
- Defense in depth for production hardening, including secrets management, security headers, webhook signatures, and future database RLS

---

## 2. Current Implementation Snapshot

Implemented:

- Global RS256 JWT guard at API startup
- `Authorization: Bearer <token>` is the only browser-supplied identity input used by protected APIs
- Trusted header fallback has been removed; the backend no longer accepts `x-tenant-id`, `x-user-id`, or `x-user-roles` from the frontend as identity
- Tenant/user/role context is resolved server-side from verified JWT claims and database records
- Controller-level RBAC through `@Roles(...)` and `RolesGuard`
- Global validation pipe with `whitelist`, `forbidNonWhitelisted`, and transform enabled
- Helmet security headers
- CORS allowlist outside local development
- Webhook signature guard foundation for inbound webhook authenticity
- Privacy consent, DSAR, and erasure APIs
- Audit log interceptor foundation for request-level audit context

Still pending or partial:

- Production OIDC callback and httpOnly cookie refresh flow
- Short-lived access tokens and refresh-token rotation
- Redis-backed token deny-list/session revocation
- Redis-backed RBAC lookup cache
- Route-level frontend permission gating
- Prisma tenant scoping middleware and PostgreSQL RLS policies
- Automated security tests, SAST, DAST, and dependency scanning in CI
- Centralized security event monitoring and alerting

---

## 3. Authentication

### 3.1 Request Authentication

Protected API requests must include:

```http
Authorization: Bearer <jwt>
```

The global `JwtAuthGuard` verifies:

- Token is present and uses Bearer format
- Signature is valid using `JWT_PUBLIC_KEY`
- Algorithm is `RS256`
- Issuer matches `JWT_ISSUER`
- Token is not expired
- `sub` claim exists
- `tenantId` claim exists

The guard is registered globally in `main.ts`:

```ts
app.useGlobalGuards(app.get(JwtAuthGuard));
```

Public paths currently bypass the guard:

- `/api/v1/auth/login`
- `/api/v1/health`
- `/api/v1/webhooks/*`
- Swagger/OpenAPI docs paths

Webhook routes are public only from JWT perspective; they must use HMAC signature validation where enabled.

### 3.2 Local Login

The local login endpoint, `POST /api/v1/auth/login`, validates email/password against the Padma database and issues an RS256 JWT.

Required backend environment variables:

```env
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_ISSUER="https://auth.padma.local"
```

Implementation notes:

- `JWT_PRIVATE_KEY` signs local login tokens.
- `JWT_PUBLIC_KEY` verifies protected requests.
- PEM values may use escaped newlines (`\n`) in `.env`; the backend normalizes them before signing or verification.
- `JWT_SECRET` and HS256 tokens are no longer used.

### 3.3 Production Target

The production target is OIDC-based authentication:

- OIDC provider authenticates the user.
- Padma receives/verifies an RS256 JWT from the provider.
- Browser storage should move from session storage to httpOnly secure cookies.
- Access tokens should be short lived.
- Refresh tokens should rotate and support revocation.
- Password handling should move out of Padma when OIDC is fully enabled.

---

## 4. Tenant Context

The tenant context is created only after JWT verification.

Trusted source:

- `tenantId` claim from the verified JWT
- `sub` claim from the verified JWT
- Padma database records for user, tenant, role, permissions, and facility membership

The guard resolves:

1. `User` by `oidcSub = jwt.sub`
2. Active `Tenant` by `jwt.tenantId`
3. Active `UserTenantRole` for `(user.id, tenant.id)`
4. Role permissions through `RolePermission`

It attaches:

```ts
request.tenantContext = {
  tenantId,
  userId,
  roleId,
  roleCode,
  permissions,
  facilityId,
};
```

Existing controllers continue to use:

```ts
@Tenant() tenant: TenantContext
```

Security boundary:

- The frontend does not supply trusted tenant or user identity headers.
- Changing session storage values such as `padma_user_id` or `padma_tenant_id` cannot change backend authorization.
- Cross-tenant access requires a JWT with a valid tenant claim and an active database role membership for that tenant.

---

## 5. Authorization

Padma currently uses role-level authorization at controller level:

```ts
@UseGuards(RolesGuard)
@Roles('admin', 'supervisor', 'care_coordinator')
```

`RolesGuard` reads `request.tenantContext.roleCode`, which is produced by `JwtAuthGuard`.

Current role model:

- `admin`
- `supervisor`
- `care_coordinator`
- `physician`
- `nurse`
- `viewer`

Implementation pattern:

- Controller methods declare allowed roles.
- Services additionally scope queries by `tenantId`.
- Workflow-specific ownership rules are implemented in service queries where needed, for example care-team-scoped `My Patients`.

Pending improvements:

- Permission-code checks in addition to broad role checks
- Reusable ownership guards for resources such as task, enrollment, patient, and message
- Frontend route and action hiding based on role and permission metadata

---

## 6. Frontend Security Model

The frontend Axios client sends only:

```http
Authorization: Bearer <token>
```

It no longer sends these identity headers:

- `x-tenant-id`
- `x-user-id`
- `x-user-roles`

Session storage is still used for local development UI state:

- `padma_token`
- `padma_tenant_id`
- `padma_user_id`
- `padma_user_role`

Only `padma_token` is used for backend authentication. The other values are UI state and should not be treated as trusted.

Production target:

- Replace session storage token handling with httpOnly secure cookies
- Add CSRF protection if cookie-authenticated unsafe methods are used
- Add route-level authorization and action gating
- Avoid exposing sensitive user or tenant metadata beyond what the UI needs

---

## 7. API Validation and Request Hardening

Global NestJS validation is enabled:

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
```

Security impact:

- Unknown DTO properties are rejected.
- Query and body types are transformed before controller logic.
- Mass-assignment risk is reduced.

Recent implementation example:

- `/communication/messages` uses a dedicated `ListMessagesDto`.
- Pagination and filters live in the same whitelisted DTO.
- `patientId` filtering no longer fails validation and cannot bypass tenant scoping.

---

## 8. Webhook Security

Inbound webhook endpoints are excluded from JWT authentication because external systems do not authenticate as Padma users.

Webhook security is handled separately:

- HMAC signature validation through `WebhookSignatureGuard`
- Timestamp validation to reduce replay risk
- Raw body support enabled in Nest bootstrap
- Per-provider shared secrets from environment variables

Required production posture:

- Unique secret per provider
- Secret rotation process
- Replay window enforcement
- Webhook event persistence and idempotent processing
- Provider IP allowlisting where supported

---

## 9. Secrets and Key Management

Secrets currently come from environment variables.

Sensitive values:

- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `DATABASE_URL`
- Provider API keys
- Webhook HMAC secrets

Rules:

- Do not commit real production secrets.
- Local `.env` may contain local-only development keys.
- Use escaped newlines for PEM values in `.env`.
- Rotate JWT keys by publishing the new public key before switching signing keys.

Production target:

- AWS Secrets Manager, HashiCorp Vault, or equivalent
- Key rotation runbook
- Separate dev/staging/prod keys
- No long-lived secrets in Docker images

---

## 10. Privacy and Audit Controls

Implemented privacy modules include:

- Patient consent recording
- Consent deletion
- DSAR export
- Erasure/anonymization workflows

Audit foundation:

- `AuditLogInterceptor` has request context access through `tenantContext`
- Security-relevant events should include tenant, user, route, method, and entity identifiers where appropriate

Pending:

- Centralized audit log persistence for all mutating domain actions
- Immutable security event stream
- Alert rules for suspicious access patterns
- Break-glass access workflow for emergency care scenarios

---

## 11. Remaining Security Backlog

High priority:

- Add automated tests for `JwtAuthGuard`
- Add integration tests proving forged `x-tenant-id` and `x-user-id` headers are ignored
- Add cross-tenant access tests for patients, enrollments, tasks, care chat, messages, and privacy APIs
- Implement Redis-backed token deny-list/session revocation
- Add permission-code checks for sensitive actions
- Add Prisma tenant scoping middleware or equivalent query enforcement

Production hardening:

- httpOnly cookie auth and refresh-token rotation
- CSRF protection for cookie-based auth
- RLS policies for core tenant-owned tables
- SAST/DAST/dependency scanning in CI
- Centralized security logging and alerting
- Strict production CORS allowlist per deployment
- CSP tuning and automated header checks

---

## 12. Verification Commands

After auth/security changes:

```bash
cd backend/services/care-coordination
npm run build

cd ../../../frontend
npm run type-check
npm run build
```

Manual smoke checks:

1. `POST /api/v1/auth/login` returns an RS256 Bearer token.
2. Protected API without `Authorization` returns `401`.
3. Protected API with malformed token returns `401`.
4. Protected API with valid token returns data for the token tenant.
5. Adding forged `x-tenant-id`, `x-user-id`, or `x-user-roles` headers does not change access.
