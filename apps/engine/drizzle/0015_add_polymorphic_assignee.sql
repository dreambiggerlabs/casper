-- Migration: Add polymorphic assignee (agent or user) to task
-- Adds a `user` table, `assignee_type` enum, and replaces `task.agent_id`
-- with `assignee_id` + `assignee_type`.

--> statement-breakpoint
CREATE TABLE "user" (
  "id" serial PRIMARY KEY NOT NULL,
  "uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  CONSTRAINT "user_uuid_unique" UNIQUE("uuid"),
  CONSTRAINT "user_email_unique" UNIQUE("email")
);

--> statement-breakpoint
CREATE TYPE "assignee_type" AS ENUM ('agent', 'user');

--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "assignee_id" integer;

--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "assignee_type" "assignee_type";

--> statement-breakpoint
UPDATE "task"
SET "assignee_id" = "agent_id", "assignee_type" = 'agent'
WHERE "agent_id" IS NOT NULL;

--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "task_agent_id_agent_id_fk";

--> statement-breakpoint
ALTER TABLE "task" DROP COLUMN "agent_id";

--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_assignee_consistency"
  CHECK (
    ("assignee_id" IS NULL AND "assignee_type" IS NULL)
    OR ("assignee_id" IS NOT NULL AND "assignee_type" IS NOT NULL)
  );
