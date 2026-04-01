import {
  NotFoundError,
  ValidationError,
  zodIssuesToViolations,
} from "../shared/errors/index.js";

import { createProjectSchema, updateProjectSchema } from "./project.schema.js";
import type { Project, ProjectRepository } from "./project.types.js";

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async createProject(input: unknown): Promise<Project> {
    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }
    return this.repository.create(parsed.data);
  }

  async getProject(uuid: string): Promise<Project> {
    const project = await this.repository.findByUuid(uuid);
    if (!project) {
      throw new NotFoundError("Project", uuid);
    }
    return project;
  }

  async listProjects(): Promise<Project[]> {
    return this.repository.findAll();
  }

  async updateProject(uuid: string, input: unknown): Promise<Project> {
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    const updated = await this.repository.update(uuid, parsed.data);
    if (!updated) {
      throw new NotFoundError("Project", uuid);
    }
    return updated;
  }
}
