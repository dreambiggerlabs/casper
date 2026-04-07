-- Migration: Change FK columns from uuid to integer (reference .id instead of .uuid)
-- Affected tables: task (project_id, parent_id, agent_id), worker_job (worker_id, task_id)

--> statement-breakpoint
-- Step 1: Drop existing foreign key constraints
ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "task_project_id_project_uuid_fk";
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "task_parent_id_task_uuid_fk";
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT IF EXISTS "task_agent_id_agent_uuid_fk";
--> statement-breakpoint
ALTER TABLE "worker_job" DROP CONSTRAINT IF EXISTS "worker_job_worker_id_worker_uuid_fk";
--> statement-breakpoint
ALTER TABLE "worker_job" DROP CONSTRAINT IF EXISTS "worker_job_task_id_task_uuid_fk";

--> statement-breakpoint
-- Step 2: Add new integer columns
ALTER TABLE "task" ADD COLUMN "project_id_new" integer;
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "parent_id_new" integer;
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "agent_id_new" integer;
--> statement-breakpoint
ALTER TABLE "worker_job" ADD COLUMN "worker_id_new" integer;
--> statement-breakpoint
ALTER TABLE "worker_job" ADD COLUMN "task_id_new" integer;

--> statement-breakpoint
-- Step 3: Populate new columns from existing UUID references
UPDATE "task" SET "project_id_new" = (SELECT "id" FROM "project" WHERE "project"."uuid" = "task"."project_id");
--> statement-breakpoint
UPDATE "task" SET "parent_id_new" = (SELECT "id" FROM "task" t2 WHERE t2."uuid" = "task"."parent_id") WHERE "task"."parent_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "task" SET "agent_id_new" = (SELECT "id" FROM "agent" WHERE "agent"."uuid" = "task"."agent_id") WHERE "task"."agent_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "worker_job" SET "worker_id_new" = (SELECT "id" FROM "worker" WHERE "worker"."uuid" = "worker_job"."worker_id");
--> statement-breakpoint
UPDATE "worker_job" SET "task_id_new" = (SELECT "id" FROM "task" WHERE "task"."uuid" = "worker_job"."task_id") WHERE "worker_job"."task_id" IS NOT NULL;

--> statement-breakpoint
-- Step 4: Drop old UUID columns
ALTER TABLE "task" DROP COLUMN "project_id";
--> statement-breakpoint
ALTER TABLE "task" DROP COLUMN "parent_id";
--> statement-breakpoint
ALTER TABLE "task" DROP COLUMN "agent_id";
--> statement-breakpoint
ALTER TABLE "worker_job" DROP COLUMN "worker_id";
--> statement-breakpoint
ALTER TABLE "worker_job" DROP COLUMN "task_id";

--> statement-breakpoint
-- Step 5: Rename new columns to original names
ALTER TABLE "task" RENAME COLUMN "project_id_new" TO "project_id";
--> statement-breakpoint
ALTER TABLE "task" RENAME COLUMN "parent_id_new" TO "parent_id";
--> statement-breakpoint
ALTER TABLE "task" RENAME COLUMN "agent_id_new" TO "agent_id";
--> statement-breakpoint
ALTER TABLE "worker_job" RENAME COLUMN "worker_id_new" TO "worker_id";
--> statement-breakpoint
ALTER TABLE "worker_job" RENAME COLUMN "task_id_new" TO "task_id";

--> statement-breakpoint
-- Step 6: Add NOT NULL constraints where required
ALTER TABLE "task" ALTER COLUMN "project_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "worker_job" ALTER COLUMN "worker_id" SET NOT NULL;

--> statement-breakpoint
-- Step 7: Add new foreign key constraints referencing .id
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_parent_id_task_id_fk" FOREIGN KEY ("parent_id") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "worker_job" ADD CONSTRAINT "worker_job_worker_id_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "worker"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "worker_job" ADD CONSTRAINT "worker_job_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
