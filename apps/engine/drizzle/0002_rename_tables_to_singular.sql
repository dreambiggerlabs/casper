ALTER TABLE "projects" RENAME TO "project";
--> statement-breakpoint
ALTER TABLE "tasks" RENAME TO "task";
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "tasks_project_id_projects_uuid_fk";
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_project_uuid_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("uuid") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "tasks_parent_id_tasks_uuid_fk";
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_parent_id_task_uuid_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."task"("uuid") ON DELETE no action ON UPDATE no action;