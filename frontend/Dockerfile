# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ─── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env — backend URL used by Next.js rewrites at build time
ARG BACKEND_INTERNAL_URL=http://backend:3020
ENV BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}

RUN npm run build

# ─── Stage 3: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# next build --output standalone copies only what is needed
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
