#!/bin/sh
set -e

echo "▶  Running Prisma migrations..."
npx prisma migrate deploy --schema=prisma/schema-core.prisma
npx prisma migrate deploy --schema=prisma/schema-engagement.prisma

echo "▶  Starting Padma backend on port ${PORT:-3020}..."
exec node dist/main
