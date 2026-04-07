-- Migrate task statuses to new values
UPDATE "task" SET "status" = 'backlog' WHERE "status" = 'pending';
UPDATE "task" SET "status" = 'ready' WHERE "status" = 'assigned';
UPDATE "task" SET "status" = 'in_progress' WHERE "status" = 'processing';

-- Update default value for new tasks
ALTER TABLE "task" ALTER COLUMN "status" SET DEFAULT 'backlog';
