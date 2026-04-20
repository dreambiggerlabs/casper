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

import { project } from "@/project/infrastructure/schema/project.schema.js";
import { TASK_STATUS_VALUES } from "@/task/domain/value-object/task-status.value-object.js";
import { ASSIGNEE_TYPE_VALUES } from "@/task/domain/value-object/assignee.value-object.js";

export const taskStatusEnum = pgEnum("task_status", TASK_STATUS_VALUES);

export const assigneeTypeEnum = pgEnum("assignee_type", ASSIGNEE_TYPE_VALUES);

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
