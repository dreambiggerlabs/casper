import {
  pgTable,
  pgEnum,
  serial,
  integer,
  uuid,
  varchar,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { project } from "../project/project.schema.js";
import { agent } from "../agent/agent.schema.js";
import { iriSchema, nullableIriSchema } from "../shared/iri/index.js";

export const taskStatusValues = [
  "backlog",
  "ready",
  "in_progress",
  "review",
  "completed",
] as const;

export const taskStatusEnum = pgEnum("task_status", taskStatusValues);

export const taskStatusSchema = z.enum(taskStatusValues);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const task = pgTable(
  "task",
  {
    id: serial("id").primaryKey(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    projectId: integer("project_id").notNull(),
    parentId: integer("parent_id"),
    status: taskStatusEnum().notNull().default("backlog"),
    agentId: integer("agent_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    projectForeignKey: foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.id],
    }),
    parentForeignKey: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
    }),
    agentForeignKey: foreignKey({
      columns: [table.agentId],
      foreignColumns: [agent.id],
    }),
  }),
);

export const createTaskSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(255),
    project: iriSchema("projects"),
    parent: iriSchema("tasks").optional(),
  })
  .transform(({ title, project, parent }) => ({
    title,
    projectId: project,
    parentId: parent,
  }));

export const updateTaskSchema = z
  .object({
    title: z.string().min(1, "Title must not be empty").max(255).optional(),
    project: iriSchema("projects").optional(),
    parent: nullableIriSchema("tasks").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .transform(({ title, project, parent }) => ({
    title,
    projectId: project,
    parentId: parent,
  }));

export const assignTaskSchema = z
  .object({
    agent: iriSchema("agents"),
  })
  .transform(({ agent }) => ({
    agentId: agent,
  }));

export const updateTaskStatusSchema = z.object({
  status: taskStatusSchema,
});
