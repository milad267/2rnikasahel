-- Migration: Add unique constraint for superadmin role
-- Date: 2026-07-14
-- Purpose: Prevent multiple superadmin users (race condition protection)

-- Partial unique index: only one row can have role='superadmin'
-- This prevents race conditions at the database level
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_superadmin_unique_idx"
  ON "admin_users" ((CASE WHEN "role" = 'superadmin' THEN 1 ELSE NULL END))
  WHERE "role" = 'superadmin';

-- Add setup_state column to track wizard progress
ALTER TABLE "admin_users"
  ADD COLUMN IF NOT EXISTS "setup_state" VARCHAR(20) DEFAULT 'completed';
