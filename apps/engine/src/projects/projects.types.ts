import type { z } from "zod";

import type {
  createProjectSchema,
  updateProjectSchema,
} from "./projects.schema.js";

export interface Project {
  uuid: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

export interface ProjectReader {
  findByUuid(uuid: string): Promise<Project | undefined>;
  findAll(): Promise<Project[]>;
}

export interface ProjectWriter {
  create(data: CreateProject): Promise<Project>;
  update(uuid: string, data: UpdateProject): Promise<Project | undefined>;
}

export interface ProjectRepository extends ProjectReader, ProjectWriter {}
