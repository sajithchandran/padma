#!/bin/sh
set -e

echo "▶  Running Prisma migrations..."
npx prisma migrate deploy --schema=prisma/schema.prisma

echo "▶  Starting Padma Care Coordination API on port ${PORT:-3020}..."
exec node dist/main
