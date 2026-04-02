CREATE TABLE "worker" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "worker_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "worker_id" uuid;
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_worker_id_worker_uuid_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."worker"("uuid") ON DELETE no action ON UPDATE no action;