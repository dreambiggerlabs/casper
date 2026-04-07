-- Create enum types
CREATE TYPE "task_status" AS ENUM ('backlog', 'ready', 'in_progress', 'review', 'completed');
CREATE TYPE "worker_status" AS ENUM ('active', 'inactive');
CREATE TYPE "job_type" AS ENUM ('execute_task', 'cleanup', 'start_preview', 'stop_preview');
CREATE TYPE "job_status" AS ENUM ('pending', 'in_progress', 'completed', 'failed');

-- Convert task.status from varchar to enum
ALTER TABLE "task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "task" ALTER COLUMN "status" TYPE "task_status" USING "status"::"task_status";
ALTER TABLE "task" ALTER COLUMN "status" SET DEFAULT 'backlog';

-- Convert worker.status from varchar to enum
ALTER TABLE "worker" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "worker" ALTER COLUMN "status" TYPE "worker_status" USING "status"::"worker_status";
ALTER TABLE "worker" ALTER COLUMN "status" SET DEFAULT 'active';

-- Convert worker_job.type from varchar to enum
ALTER TABLE "worker_job" ALTER COLUMN "type" TYPE "job_type" USING "type"::"job_type";

-- Drop index that uses status comparison before converting column type
DROP INDEX IF EXISTS "worker_job_task_id_unique";

-- Convert worker_job.status from varchar to enum
ALTER TABLE "worker_job" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "worker_job" ALTER COLUMN "status" TYPE "job_status" USING "status"::"job_status";
ALTER TABLE "worker_job" ALTER COLUMN "status" SET DEFAULT 'pending';

-- Recreate index with enum type
CREATE UNIQUE INDEX "worker_job_task_id_unique" ON "worker_job"("task_id") WHERE "task_id" IS NOT NULL AND "status" != 'failed';
