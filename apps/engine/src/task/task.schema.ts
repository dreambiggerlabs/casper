import {
  pgTable,
  serial,
  uuid,
  varchar,
  timestamp,
  foreignKey,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { project } from "../project/project.schema.js";
import { agent } from "../agent/agent.schema.js";

export const taskStatusSchema = z.enum([
  "pending",
  "assigned",
  "processing",
  "in_progress",
  "completed",
]);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const task = pgTable(
  "task",
  {
    id: serial("id").primaryKey(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    projectId: uuid("project_id").notNull(),
    parentId: uuid("parent_id"),
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    agentId: uuid("agent_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    projectForeignKey: foreignKey({
      columns: [table.projectId],
      foreignColumns: [project.uuid],
    }),
    parentForeignKey: foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.uuid],
    }),
    agentForeignKey: foreignKey({
      columns: [table.agentId],
      foreignColumns: [agent.uuid],
    }),
  }),
);

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  projectId: z.string().uuid("Project ID must be a valid UUID"),
  parentId: z.string().uuid("Parent ID must be a valid UUID").optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1, "Title must not be empty").max(255).optional(),
    projectId: z.string().uuid("Project ID must be a valid UUID").optional(),
    parentId: z
      .string()
      .uuid("Parent ID must be a valid UUID")
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const assignTaskSchema = z.object({
  agentId: z.string().uuid("Agent ID must be a valid UUID"),
});

export const updateTaskStatusSchema = z.object({
  status: taskStatusSchema,
});