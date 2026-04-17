import type { z } from "zod";

import type {
  createProjectSchema,
  credentialSchema,
  updateProjectSchema,
} from "./project.schema.js";

export type CredentialType = "https_token" | "ssh_key";

export interface Project {
  "@id": string;
  uuid: string;
  title: string;
  description: string | null;
  repositoryUrl: string | null;
  credentialType: CredentialType | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export type ProjectCredential = z.infer<typeof credentialSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;

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
