import { z } from "zod";

import { IriSchemaFactory } from "@/shared/domain/iri/iri-schema.factory.js";
import {
  ASSIGNEE_TYPE_VALUES,
  type AssigneeType,
} from "@/task/domain/value-object/assignee.value-object.js";
import { TASK_STATUS_VALUES } from "@/task/domain/value-object/task-status.value-object.js";

const iriSchemas = new IriSchemaFactory();

const statusSchema = z.enum(TASK_STATUS_VALUES);

const assigneeTypeSchema = z.enum(ASSIGNEE_TYPE_VALUES);

export const TaskDto = {
  status: statusSchema,
  assigneeType: assigneeTypeSchema,

  create: z
    .object({
      title: z.string().min(1, "Title is required").max(255),
      description: z.string().nullish(),
      project: iriSchemas.iri("projects"),
      parent: iriSchemas.iri("tasks").optional(),
    })
    .transform(({ title, description, project, parent }) => ({
      title,
      description,
      projectId: project,
      parentId: parent,
    })),

  update: z
    .object({
      title: z.string().min(1, "Title must not be empty").max(255).optional(),
      description: z.string().nullish(),
      project: iriSchemas.iri("projects").optional(),
      parent: iriSchemas.nullableIri("tasks").optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    })
    .transform(({ title, description, project, parent }) => ({
      title,
      description,
      projectId: project,
      parentId: parent,
    })),

  assign: z
    .object({
      assignee: iriSchemas.polymorphicIri(["agents", "users"] as const),
    })
    .transform(({ assignee }) => ({
      assigneeType: (assignee.resource === "agents"
        ? "agent"
        : "user") as AssigneeType,
      assigneeUuid: assignee.uuid,
    })),

  updateStatus: z.object({
    status: statusSchema,
  }),
} as const;

export type CreateTask = z.infer<typeof TaskDto.create>;
export type UpdateTask = z.infer<typeof TaskDto.update>;
export type AssignTask = z.infer<typeof TaskDto.assign>;
export type UpdateTaskStatus = z.infer<typeof TaskDto.updateStatus>;
