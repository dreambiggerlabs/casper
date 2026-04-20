import { NotFoundError } from "@/shared/domain/error/not-found.error.js";
import { ValidationError } from "@/shared/domain/error/validation.error.js";
import type {
  PaginatedResult,
  PaginationParams,
} from "@/shared/domain/value-object/pagination.value-object.js";
import { ReferenceResolver } from "@/shared/application/reference/reference-resolver.js";
import type { Task } from "@/task/domain/entity/task.entity.js";
import type { AssigneeRef } from "@/task/domain/value-object/assignee.value-object.js";
import type { TaskFilters, TaskRepository } from "@/task/application/port/task.repository.js";

import { TaskDto } from "@/task/application/dto/task.dto.js";

type AssigneeReferenceResolver = ReferenceResolver<"agents" | "users">;

export class TaskService {
  constructor(
    private readonly repository: TaskRepository,
    private readonly projectResolver: ReferenceResolver<"projects">,
    private readonly assigneeResolver: AssigneeReferenceResolver,
  ) {}

  async createTask(input: unknown): Promise<Task> {
    const parsed = TaskDto.create.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
    }

    await this.projectResolver.assertExists("projects", parsed.data.projectId);
    if (parsed.data.parentId) {
      await this.assertParentExists(parsed.data.parentId);
    }

    return this.repository.create(parsed.data);
  }

  async getTask(uuid: string): Promise<Task> {
    const task = await this.repository.findByUuid(uuid);
    if (!task) {
      throw new NotFoundError("Task", uuid);
    }

    return task;
  }

  async listTasks(
    filters: { status?: string; assignee?: AssigneeRef } | undefined,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Task>> {
    const offset = (pagination.page - 1) * pagination.itemsPerPage;
    const repoFilters: TaskFilters = {};

    if (filters?.status) {
      const parsedStatus = TaskDto.status.safeParse(filters.status);
      if (!parsedStatus.success) {
        throw ValidationError.fromZodIssues(parsedStatus.error.issues);
      }
      repoFilters.status = parsedStatus.data;
    }
    if (filters?.assignee) {
      repoFilters.assignee = filters.assignee;
    }

    const [items, totalItems] = await Promise.all([
      this.repository.findPaginated({
        limit: pagination.itemsPerPage,
        offset,
        ...repoFilters,
      }),
      this.repository.count(repoFilters),
    ]);

    return { items, totalItems };
  }

  async listTasksByProject(
    projectId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Task>> {
    await this.projectResolver.assertExists("projects", projectId);

    const offset = (pagination.page - 1) * pagination.itemsPerPage;
    const [items, totalItems] = await Promise.all([
      this.repository.findPaginated({
        limit: pagination.itemsPerPage,
        offset,
        projectId,
      }),
      this.repository.count({ projectId }),
    ]);

    return { items, totalItems };
  }

  async updateTask(uuid: string, input: unknown): Promise<Task> {
    const parsed = TaskDto.update.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
    }

    if (parsed.data.projectId) {
      await this.projectResolver.assertExists(
        "projects",
        parsed.data.projectId,
      );
    }
    if (parsed.data.parentId) {
      await this.assertParentExists(parsed.data.parentId);
    }

    const updated = await this.repository.update(uuid, parsed.data);
    if (!updated) {
      throw new NotFoundError("Task", uuid);
    }

    return updated;
  }

  async assignTask(taskUuid: string, input: unknown): Promise<Task> {
    const parsed = TaskDto.assign.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
    }

    const existing = await this.repository.findByUuid(taskUuid);
    if (!existing) {
      throw new NotFoundError("Task", taskUuid);
    }

    const resource = parsed.data.assigneeType === "agent" ? "agents" : "users";
    await this.assigneeResolver.assertExists(
      resource,
      parsed.data.assigneeUuid,
    );

    const updated = await this.repository.assign(taskUuid, {
      type: parsed.data.assigneeType,
      uuid: parsed.data.assigneeUuid,
    });
    if (!updated) {
      throw new NotFoundError("Task", taskUuid);
    }

    return updated;
  }

  async updateTaskStatus(uuid: string, input: unknown): Promise<Task> {
    const parsed = TaskDto.updateStatus.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
    }

    const existing = await this.repository.findByUuid(uuid);
    if (!existing) {
      throw new NotFoundError("Task", uuid);
    }

    const updated = await this.repository.updateStatus(
      uuid,
      parsed.data.status,
    );
    if (!updated) {
      throw new NotFoundError("Task", uuid);
    }

    return updated;
  }

  private async assertParentExists(parentUuid: string): Promise<void> {
    const parent = await this.repository.findByUuid(parentUuid);
    if (!parent) {
      throw new NotFoundError("Parent task", parentUuid);
    }
  }
}
