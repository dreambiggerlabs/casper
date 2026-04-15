import type { z } from "zod";

import type {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  updateTaskStatusSchema,
  TaskStatus,
  AssigneeType,
} from "./task.schema.js";

export interface AssigneeRef {
  type: AssigneeType;
  uuid: string;
}

export interface Task {
  "@id": string;
  uuid: string;
  title: string;
  description: string | null;
  project: string;
  parent: string | null;
  status: TaskStatus;
  assignee: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export type CreateTask = z.infer<typeof createTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type AssignTask = z.infer<typeof assignTaskSchema>;
export type UpdateTaskStatus = z.infer<typeof updateTaskStatusSchema>;

export interface TaskReader {
  findByUuid(uuid: string): Promise<Task | undefined>;
  findByProjectId(projectId: string): Promise<Task[]>;
  findByStatusAndAssignee(
    status: TaskStatus,
    assignee: AssigneeRef,
  ): Promise<Task[]>;
  findAll(): Promise<Task[]>;
  count(filters?: {
    status?: TaskStatus;
    assignee?: AssigneeRef;
    projectId?: string;
  }): Promise<number>;
  findPaginated(params: {
    limit: number;
    offset: number;
    status?: TaskStatus;
    assignee?: AssigneeRef;
    projectId?: string;
  }): Promise<Task[]>;
}

export interface TaskWriter {
  create(data: CreateTask): Promise<Task>;
  update(uuid: string, data: UpdateTask): Promise<Task | undefined>;
  assign(uuid: string, assignee: AssigneeRef): Promise<Task | undefined>;
  updateStatus(uuid: string, status: TaskStatus): Promise<Task | undefined>;
}

export interface TaskRepository extends TaskReader, TaskWriter {}
