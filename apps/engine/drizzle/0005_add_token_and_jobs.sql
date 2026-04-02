-- Add token column to worker table
ALTER TABLE "worker" ADD COLUMN "token" varchar(64) NOT NULL DEFAULT '';
ALTER TABLE "worker" ADD CONSTRAINT "worker_token_unique" UNIQUE("token");
ALTER TABLE "worker" ALTER COLUMN "token" DROP DEFAULT;

-- Create worker_job table
CREATE TABLE "worker_job" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"task_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "worker_job_uuid_unique" UNIQUE("uuid")
);

ALTER TABLE "worker_job" ADD CONSTRAINT "worker_job_worker_id_worker_uuid_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("uuid") ON DELETE no action ON UPDATE no action;

ALTER TABLE "worker_job" ADD CONSTRAINT "worker_job_task_id_task_uuid_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("uuid") ON DELETE no action ON UPDATE no action;

-- Unique constraint: only one job per task at a time
CREATE UNIQUE INDEX "worker_job_task_id_unique" ON "worker_job"("task_id") WHERE "task_id" IS NOT NULL;

-- Remove worker_id from task (jobs track workers, not tasks)
ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "task_worker_id_worker_uuid_fk";
ALTER TABLE "task" DROP COLUMN IF EXISTS "worker_id";