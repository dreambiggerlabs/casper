import {
  pgTable,
  pgEnum,
  serial,
  integer,
  uuid,
  varchar,
  timestamp,
  foreignKey,
  text,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { project } from "../project/project.schema.js";
import {
  iriSchema,
  nullableIriSchema,
  polymorphicIriSchema,
} from "../shared/iri/index.js";

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

export const assigneeTypeValues = ["agent", "user"] as const;

export const assigneeTypeEnum = pgEnum("assignee_type", assigneeTypeValues);

export const assigneeTypeSchema = z.enum(assigneeTypeValues);

export type AssigneeType = z.infer<typeof assigneeTypeSchema>;

export const task = pgTable(
  "task",
  {
    id: serial("id").primaryKey(),
    uuid: uuid("uuid").defaultRandom().notNull().unique(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    projectId: integer("project_id").notNull(),
    parentId: integer("parent_id"),
    status: taskStatusEnum().notNull().default("backlog"),
    assigneeId: integer("assignee_id"),
    assigneeType: assigneeTypeEnum("assignee_type"),
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
  }),
);

export const createTaskSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(255),
    description: z.string().nullish(),
    project: iriSchema("projects"),
    parent: iriSchema("tasks").optional(),
  })
  .transform(({ title, description, project, parent }) => ({
    title,
    description,
    projectId: project,
    parentId: parent,
  }));

export const updateTaskSchema = z
  .object({
    title: z.string().min(1, "Title must not be empty").max(255).optional(),
    description: z.string().nullish(),
    project: iriSchema("projects").optional(),
    parent: nullableIriSchema("tasks").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .transform(({ title, description, project, parent }) => ({
    title,
    description,
    projectId: project,
    parentId: parent,
  }));

export const assignTaskSchema = z
  .object({
    assignee: polymorphicIriSchema(["agents", "users"] as const),
  })
  .transform(({ assignee }) => ({
    assigneeType: (assignee.resource === "agents"
      ? "agent"
      : "user") as AssigneeType,
    assigneeUuid: assignee.uuid,
  }));

export const updateTaskStatusSchema = z.object({
  status: taskStatusSchema,
});
