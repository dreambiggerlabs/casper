import type { Project } from "@/project/domain/entity/project.entity.js";
import type { ProjectCredential } from "@/project/domain/value-object/credential-type.value-object.js";
import type { CreateProject, UpdateProject } from "@/project/application/dto/project.dto.js";

export interface ProjectReader {
  findByUuid(uuid: string): Promise<Project | undefined>;
  findAll(): Promise<Project[]>;
  count(): Promise<number>;
  findPaginated(params: { limit: number; offset: number }): Promise<Project[]>;
  findCredential(uuid: string): Promise<ProjectCredential | null>;
}

export interface ProjectWriter {
  create(data: CreateProject): Promise<Project>;
  update(uuid: string, data: UpdateProject): Promise<Project | undefined>;
}

export interface ProjectRepository extends ProjectReader, ProjectWriter {}
