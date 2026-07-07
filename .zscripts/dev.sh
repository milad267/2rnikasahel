#!/bin/bash
# Custom dev script for the Dornika Sahel e-commerce project
# This project uses Drizzle ORM with PostgreSQL (external), not Prisma
# The start.sh writes DATABASE_URL=file:... which breaks pg Pool, so we clear it.

set -e
cd /home/z/my-project

echo "[DEV] Installing dependencies..."
bun install 2>&1 | tail -3

echo "[DEV] Clearing DATABASE_URL from .env (project uses fallback in db/index.ts)..."
# Remove DATABASE_URL line if present, keep other vars
if [ -f .env ]; then
  grep -v "^DATABASE_URL=" .env > .env.tmp && mv .env.tmp .env
fi

echo "[DEV] Starting Next.js dev server with webpack..."
exec bun run dev > /home/z/my-project/dev.log 2>&1