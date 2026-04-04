import type { z } from "zod";

import type {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  updateTaskStatusSchema,
  TaskStatus,
} from "./task.schema.js";

export interface Task {
  "@id": string;
  uuid: string;
  title: string;
  project: string;
  parent: string | null;
  status: TaskStatus;
  agent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type AssignTask = z.infer<typeof assignTaskSchema>;
export type UpdateTaskStatus = z.infer<typeof updateTaskStatusSchema>;

export interface TaskReader {
  findByUuid(uuid: string): Promise<Task | undefined>;
  findByProjectId(projectId: string): Promise<Task[]>;
  findByStatusAndAgentId(status: TaskStatus, agentId: string): Promise<Task[]>;
  findAll(): Promise<Task[]>;
}

export interface TaskWriter {
  create(data: CreateTask): Promise<Task>;
  update(uuid: string, data: UpdateTask): Promise<Task | undefined>;
  assign(uuid: string, agentId: string): Promise<Task | undefined>;
  updateStatus(uuid: string, status: TaskStatus): Promise<Task | undefined>;
}

export interface TaskRepository extends TaskReader, TaskWriter {}
