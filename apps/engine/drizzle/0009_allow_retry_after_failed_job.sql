-- Update unique index to exclude failed jobs, allowing retries
DROP INDEX IF EXISTS "worker_job_task_id_unique";
CREATE UNIQUE INDEX "worker_job_task_id_unique" ON "worker_job"("task_id") WHERE "task_id" IS NOT NULL AND "status" != 'failed';
