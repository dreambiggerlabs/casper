import {
  NotFoundError,
  ValidationError,
  zodIssuesToViolations,
} from "../shared/errors/index.js";

import type {
  PaginatedResult,
  PaginationParams,
} from "../shared/pagination/index.js";
import type { AgentReader } from "../agent/agent.types.js";
import type { ProjectReader } from "../project/project.types.js";

import {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  updateTaskStatusSchema,
  taskStatusSchema,
} from "./task.schema.js";
import type { Task, TaskRepository } from "./task.types.js";

export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly projectReader: ProjectReader,
    private readonly agentReader: AgentReader,
  ) {}

  async createTask(input: unknown): Promise<Task> {
    const parsed = createTaskSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    const project = await this.projectReader.findByUuid(parsed.data.projectId);
    if (!project) {
      throw new NotFoundError("Project", parsed.data.projectId);
    }

    if (parsed.data.parentId) {
      const parentTask = await this.taskRepository.findByUuid(
        parsed.data.parentId,
      );
      if (!parentTask) {
        throw new NotFoundError("Parent task", parsed.data.parentId);
      }
    }

    return this.taskRepository.create(parsed.data);
  }

  async getTask(uuid: string): Promise<Task> {
    const task = await this.taskRepository.findByUuid(uuid);
    if (!task) {
      throw new NotFoundError("Task", uuid);
    }
    return task;
  }

  async listTasks(
    filters: { status?: string; agentId?: string } | undefined,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Task>> {
    const offset = (pagination.page - 1) * pagination.itemsPerPage;
    let validatedStatus: string | undefined;

    if (filters?.status) {
      const parsedStatus = taskStatusSchema.safeParse(filters.status);
      if (!parsedStatus.success) {
        const violations = zodIssuesToViolations(parsedStatus.error.issues);
        throw new ValidationError("Invalid status", violations);
      }
      validatedStatus = parsedStatus.data;
    }

    const repoFilters = {
      status: validatedStatus as
        | import("./task.schema.js").TaskStatus
        | undefined,
      agentId: filters?.agentId,
    };

    const [items, totalItems] = await Promise.all([
      this.taskRepository.findPaginated({
        limit: pagination.itemsPerPage,
        offset,
        ...repoFilters,
      }),
      this.taskRepository.count(repoFilters),
    ]);

    return { items, totalItems };
  }

  async listTasksByProject(
    projectId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Task>> {
    const project = await this.projectReader.findByUuid(projectId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }

    const offset = (pagination.page - 1) * pagination.itemsPerPage;
    const [items, totalItems] = await Promise.all([
      this.taskRepository.findPaginated({
        limit: pagination.itemsPerPage,
        offset,
        projectId,
      }),
      this.taskRepository.count({ projectId }),
    ]);

    return { items, totalItems };
  }

  async updateTask(uuid: string, input: unknown): Promise<Task> {
    const parsed = updateTaskSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    if (parsed.data.projectId) {
      const project = await this.projectReader.findByUuid(
        parsed.data.projectId,
      );
      if (!project) {
        throw new NotFoundError("Project", parsed.data.projectId);
      }
    }

    if (parsed.data.parentId) {
      const parentTask = await this.taskRepository.findByUuid(
        parsed.data.parentId,
      );
      if (!parentTask) {
        throw new NotFoundError("Parent task", parsed.data.parentId);
      }
    }

    const updated = await this.taskRepository.update(uuid, parsed.data);
    if (!updated) {
      throw new NotFoundError("Task", uuid);
    }
    return updated;
  }

  async assignTask(taskUuid: string, input: unknown): Promise<Task> {
    const parsed = assignTaskSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    const task = await this.taskRepository.findByUuid(taskUuid);
    if (!task) {
      throw new NotFoundError("Task", taskUuid);
    }

    if (task.status !== "pending") {
      throw new ValidationError("Task is not in pending status", [
        { field: "status", message: "Only pending tasks can be assigned" },
      ]);
    }

    const agent = await this.agentReader.findByUuid(parsed.data.agentId);
    if (!agent) {
      throw new NotFoundError("Agent", parsed.data.agentId);
    }

    const updated = await this.taskRepository.assign(
      taskUuid,
      parsed.data.agentId,
    );
    if (!updated) {
      throw new NotFoundError("Task", taskUuid);
    }
    return updated;
  }

  async updateTaskStatus(uuid: string, input: unknown): Promise<Task> {
    const parsed = updateTaskStatusSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    const task = await this.taskRepository.findByUuid(uuid);
    if (!task) {
      throw new NotFoundError("Task", uuid);
    }

    const updated = await this.taskRepository.updateStatus(
      uuid,
      parsed.data.status,
    );
    if (!updated) {
      throw new NotFoundError("Task", uuid);
    }
    return updated;
  }
}
