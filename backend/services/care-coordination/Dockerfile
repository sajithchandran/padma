# ─── Build context: ./backend  (npm workspace root) ────────────────────────────
# docker-compose passes: context=./backend, dockerfile=services/care-coordination/Dockerfile
# All COPY source paths are relative to ./backend/

# ─── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# 1. Workspace root manifest — layer cache key for dep changes
COPY package.json package-lock.json ./

# 2. Every service package.json must exist before `npm ci`
#    so workspace resolution succeeds (add one line per new service)
COPY services/care-coordination/package.json ./services/care-coordination/

# 3. Install all workspace deps; npm hoists shared packages to /app/node_modules,
#    service-only packages land in /app/services/care-coordination/node_modules
RUN npm ci

# 4. Copy Prisma schemas early (generate is slow; rarely changes)
COPY services/care-coordination/prisma ./services/care-coordination/prisma

# 5. Generate Prisma clients into the service node_modules
#    (output="../node_modules/.prisma/..." → relative to each schema file)
RUN npm run prisma:generate --workspace=@padma/care-coordination

# 6. Copy full service source and compile TypeScript via NestJS CLI
COPY services/care-coordination ./services/care-coordination
RUN npm run build --workspace=@padma/care-coordination

# ─── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Set WORKDIR to the service directory so all relative paths (dist/, prisma/, etc.)
# match the dev / local experience and the entrypoint script stays unchanged.
WORKDIR /app/services/care-coordination

ENV NODE_ENV=production

# Runtime deps + generated Prisma clients (output is inside service node_modules)
COPY --from=builder /app/services/care-coordination/node_modules ./node_modules

# Compiled JS
COPY --from=builder /app/services/care-coordination/dist ./dist

# Package manifest (needed by Prisma CLI for workspace awareness)
COPY --from=builder /app/services/care-coordination/package.json ./

# Prisma schemas + migrations — required by `prisma migrate deploy` at startup
COPY --from=builder /app/services/care-coordination/prisma ./prisma

# Startup script
COPY services/care-coordination/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3020
ENTRYPOINT ["./docker-entrypoint.sh"]
