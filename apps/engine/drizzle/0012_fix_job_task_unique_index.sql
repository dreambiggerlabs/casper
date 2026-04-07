-- Rename job_status enum value 'pending' to 'ready'
ALTER TYPE "job_status" RENAME VALUE 'pending' TO 'ready';

-- Update default for worker_job.status
ALTER TABLE "worker_job" ALTER COLUMN "status" SET DEFAULT 'ready';

-- Fix: allow re-claiming tasks that were previously completed
-- The old index only excluded 'failed' jobs, blocking new jobs for completed tasks
DROP INDEX IF EXISTS "worker_job_task_id_unique";
CREATE UNIQUE INDEX "worker_job_task_id_unique" ON "worker_job"("task_id") WHERE "task_id" IS NOT NULL AND "status" = 'in_progress';
