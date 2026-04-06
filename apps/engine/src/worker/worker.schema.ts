import {
  pgTable,
  serial,
  uuid,
  varchar,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { task } from "../task/task.schema.js";
import { iriSchema } from "../shared/iri/index.js";

export const workerStatusSchema = z.enum(["active", "inactive"]);

export type WorkerStatus = z.infer<typeof workerStatusSchema>;

export const jobTypeSchema = z.enum([
  "execute_task",
  "cleanup",
  "start_preview",
  "stop_preview",
]);

export type JobType = z.infer<typeof jobTypeSchema>;

export const jobStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "failed",
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;

export const worker = pgTable("worker", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: varchar("status", { length: 50 }).notNull().default("active"),
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
    type: varchar("type", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    taskId: uuid("task_id"),
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
});

export const claimTaskSchema = z
  .object({
    worker: iriSchema("workers"),
  })
  .transform(({ worker }) => ({
    workerUuid: worker,
  }));
