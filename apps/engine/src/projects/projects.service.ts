import { NotFoundError, ValidationError } from "../shared/errors/index.js";

import { createProjectSchema, updateProjectSchema } from "./projects.schema.js";
import type { Project, ProjectRepository } from "./projects.types.js";

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async createProject(input: unknown): Promise<Project> {
    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid input",
      );
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
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid input",
      );
    }

    const updated = await this.repository.update(uuid, parsed.data);
    if (!updated) {
      throw new NotFoundError("Project", uuid);
    }
    return updated;
  }
}
