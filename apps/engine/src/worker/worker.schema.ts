import {
  pgTable,
  pgEnum,
  serial,
  uuid,
  varchar,
  text,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { task } from "../task/task.schema.js";
import { iriSchema } from "../shared/iri/index.js";

export const workerStatusValues = ["active", "inactive"] as const;
export const workerStatusEnum = pgEnum("worker_status", workerStatusValues);
export const workerStatusSchema = z.enum(workerStatusValues);

export type WorkerStatus = z.infer<typeof workerStatusSchema>;

export const jobTypeValues = [
  "execute_task",
  "cleanup",
  "start_preview",
  "stop_preview",
] as const;
export const jobTypeEnum = pgEnum("job_type", jobTypeValues);
export const jobTypeSchema = z.enum(jobTypeValues);

export type JobType = z.infer<typeof jobTypeSchema>;

export const jobStatusValues = [
  "ready",
  "in_progress",
  "completed",
  "failed",
] as const;
export const jobStatusEnum = pgEnum("job_status", jobStatusValues);
export const jobStatusSchema = z.enum(jobStatusValues);

export type JobStatus = z.infer<typeof jobStatusSchema>;

export const worker = pgTable("worker", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: workerStatusEnum().notNull().default("active"),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const workerJob = pgTable(
  "worker_job",
  {
    id: serial("id").primaryKey(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    workerId: uuid("worker_id").notNull(),
    type: jobTypeEnum().notNull(),
    status: jobStatusEnum().notNull().default("ready"),
    taskId: uuid("task_id"),
    failReason: text("fail_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    workerForeignKey: foreignKey({
      columns: [table.workerId],
      foreignColumns: [worker.uuid],
    }),
    taskForeignKey: foreignKey({
      columns: [table.taskId],
      foreignColumns: [task.uuid],
    }),
  }),
);

export const createWorkerSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).optional(),
});

export const createJobSchema = z
  .object({
    worker: iriSchema("workers"),
    type: jobTypeSchema,
    task: iriSchema("tasks").optional(),
  })
  .transform(({ worker, type, task }) => ({
    workerId: worker,
    type,
    taskId: task,
  }));

export const updateJobStatusSchema = z.object({
  status: jobStatusSchema,
  failReason: z.string().optional(),
});

export const claimTaskSchema = z
  .object({
    worker: iriSchema("workers"),
  })
  .transform(({ worker }) => ({
    workerUuid: worker,
  }));
