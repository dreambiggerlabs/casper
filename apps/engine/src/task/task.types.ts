import type { z } from "zod";

import type { createTaskSchema, updateTaskSchema } from "./task.schema.js";

export interface Task {
  uuid: string;
  title: string;
  projectId: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;

export interface TaskReader {
  findByUuid(uuid: string): Promise<Task | undefined>;
  findByProjectId(projectId: string): Promise<Task[]>;
  findAll(): Promise<Task[]>;
}

export interface TaskWriter {
  create(data: CreateTask): Promise<Task>;
  update(uuid: string, data: UpdateTask): Promise<Task | undefined>;
}

export interface TaskRepository extends TaskReader, TaskWriter {}
