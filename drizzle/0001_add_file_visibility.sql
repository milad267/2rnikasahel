-- Migration: Add visibility and ownership to uploaded_files
-- Date: 2026-07-13
-- Purpose: Support private file uploads with proper ownership tracking

ALTER TABLE "uploaded_files" 
  ADD COLUMN IF NOT EXISTS "visibility" VARCHAR(20) NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS "owner_user_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "owner_type" VARCHAR(20) NOT NULL DEFAULT 'admin';

-- Index for faster private file lookups
CREATE INDEX IF NOT EXISTS "uploaded_files_visibility_owner_idx" 
  ON "uploaded_files" ("visibility", "owner_user_id");
