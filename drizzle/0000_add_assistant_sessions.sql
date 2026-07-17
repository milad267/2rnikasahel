CREATE TABLE IF NOT EXISTS "assistant_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(128) NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assistant_sessions_session_id_idx" ON "assistant_sessions" ("session_id");