# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (including devDependencies needed for build)
COPY package*.json ./
RUN npm ci

# Copy Prisma schemas first — needed for generate
COPY prisma ./prisma

# Generate both Prisma clients
RUN npx prisma generate --schema=prisma/schema-core.prisma
RUN npx prisma generate --schema=prisma/schema-engagement.prisma

# Copy source and compile TypeScript via NestJS CLI
# (prisma generate already ran above, so we call nest build directly)
COPY . .
RUN npx nest build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Only copy what is needed at runtime
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
# Prisma schemas + migrations needed for `prisma migrate deploy` at startup
COPY --from=builder /app/prisma ./prisma

# Startup script: run migrations then start server
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3020
ENTRYPOINT ["./docker-entrypoint.sh"]
