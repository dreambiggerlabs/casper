import {
  pgTable,
  pgEnum,
  serial,
  integer,
  uuid,
  varchar,
  text,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";

import { task } from "@/task/infrastructure/schema/task.schema.js";
import { JOB_STATUS_VALUES } from "@/worker/domain/value-object/job-status.value-object.js";
import { JOB_TYPE_VALUES } from "@/worker/domain/value-object/job-type.value-object.js";
import { WORKER_STATUS_VALUES } from "@/worker/domain/value-object/worker-status.value-object.js";

export const workerStatusEnum = pgEnum("worker_status", WORKER_STATUS_VALUES);

export const jobTypeEnum = pgEnum("job_type", JOB_TYPE_VALUES);

export const jobStatusEnum = pgEnum("job_status", JOB_STATUS_VALUES);

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
    workerId: integer("worker_id").notNull(),
    type: jobTypeEnum().notNull(),
    status: jobStatusEnum().notNull().default("ready"),
    taskId: integer("task_id"),
    failReason: text("fail_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    workerForeignKey: foreignKey({
      columns: [table.workerId],
      foreignColumns: [worker.id],
    }),
    taskForeignKey: foreignKey({
      columns: [table.taskId],
      foreignColumns: [task.id],
    }),
  }),
);
