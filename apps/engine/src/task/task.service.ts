import {
  NotFoundError,
  ValidationError,
  zodIssuesToViolations,
} from "../shared/errors/index.js";

import type { ProjectReader } from "../project/project.types.js";

import { createTaskSchema, updateTaskSchema } from "./task.schema.js";
import type { Task, TaskRepository } from "./task.types.js";

export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly projectReader: ProjectReader,
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

  async listTasks(): Promise<Task[]> {
    return this.taskRepository.findAll();
  }

  async listTasksByProject(projectId: string): Promise<Task[]> {
    const project = await this.projectReader.findByUuid(projectId);
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }
    return this.taskRepository.findByProjectId(projectId);
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
}
