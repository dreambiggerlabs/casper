import type { Task } from "@/task/domain/entity/task.entity.js";
import type { AssigneeRef } from "@/task/domain/value-object/assignee.value-object.js";
import type { TaskStatus } from "@/task/domain/value-object/task-status.value-object.js";
import type { CreateTask, UpdateTask } from "@/task/application/dto/task.dto.js";

export interface TaskFilters {
  status?: TaskStatus;
  assignee?: AssigneeRef;
  projectId?: string;
}

export interface TaskReader {
  findByUuid(uuid: string): Promise<Task | undefined>;
  findByProjectId(projectId: string): Promise<Task[]>;
  findByStatusAndAssignee(
    status: TaskStatus,
    assignee: AssigneeRef,
  ): Promise<Task[]>;
  findAll(): Promise<Task[]>;
  count(filters?: TaskFilters): Promise<number>;
  findPaginated(
    params: { limit: number; offset: number } & TaskFilters,
  ): Promise<Task[]>;
}

export interface TaskWriter {
  create(data: CreateTask): Promise<Task>;
  update(uuid: string, data: UpdateTask): Promise<Task | undefined>;
  assign(uuid: string, assignee: AssigneeRef): Promise<Task | undefined>;
  updateStatus(uuid: string, status: TaskStatus): Promise<Task | undefined>;
}

export interface TaskRepository extends TaskReader, TaskWriter {}
