-- Add fail_reason column to worker_job table
ALTER TABLE "worker_job" ADD COLUMN "fail_reason" text;
