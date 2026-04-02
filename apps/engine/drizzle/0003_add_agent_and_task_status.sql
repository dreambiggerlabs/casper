CREATE TABLE "agent" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "status" varchar(50) DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "agent_id" uuid;
--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_agent_id_agent_uuid_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("uuid") ON DELETE no action ON UPDATE no action;