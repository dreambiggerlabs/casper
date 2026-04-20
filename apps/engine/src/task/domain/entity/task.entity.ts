import type { TaskStatus } from "@/task/domain/value-object/task-status.value-object.js";

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
