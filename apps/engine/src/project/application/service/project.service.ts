import { NotFoundError } from "@/shared/domain/error/not-found.error.js";
import { ValidationError } from "@/shared/domain/error/validation.error.js";
import type {
  PaginatedResult,
  PaginationParams,
} from "@/shared/domain/value-object/pagination.value-object.js";
import type { Project } from "@/project/domain/entity/project.entity.js";
import type { ProjectCredential } from "@/project/domain/value-object/credential-type.value-object.js";
import type { ProjectRepository } from "@/project/application/port/project.repository.js";

import { ProjectDto } from "@/project/application/dto/project.dto.js";

export class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  async createProject(input: unknown): Promise<Project> {
    const parsed = ProjectDto.create.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
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

  async listProjects(
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Project>> {
    const offset = (pagination.page - 1) * pagination.itemsPerPage;
    const [items, totalItems] = await Promise.all([
      this.repository.findPaginated({
        limit: pagination.itemsPerPage,
        offset,
      }),
      this.repository.count(),
    ]);

    return { items, totalItems };
  }

  async updateProject(uuid: string, input: unknown): Promise<Project> {
    const parsed = ProjectDto.update.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
    }

    const updated = await this.repository.update(uuid, parsed.data);
    if (!updated) {
      throw new NotFoundError("Project", uuid);
    }

    return updated;
  }

  async getCredential(uuid: string): Promise<ProjectCredential> {
    const project = await this.repository.findByUuid(uuid);
    if (!project) {
      throw new NotFoundError("Project", uuid);
    }
    const credential = await this.repository.findCredential(uuid);
    if (!credential) {
      throw new NotFoundError("ProjectCredential", uuid);
    }

    return credential;
  }
}
