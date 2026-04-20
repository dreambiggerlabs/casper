import type { Request, Response } from "express";

import type { HydraCollectionBuilder } from "@/shared/application/pagination/hydra-collection-builder.js";
import type { PaginationParser } from "@/shared/application/pagination/pagination-parser.js";
import type { ProjectService } from "@/project/application/service/project.service.js";

export class ProjectController {
  constructor(
    private readonly service: ProjectService,
    private readonly pagination: PaginationParser,
    private readonly collections: HydraCollectionBuilder,
  ) {}

  async create(request: Request, response: Response): Promise<void> {
    const project = await this.service.createProject(request.body);
    response.status(201).json(project);
  }

  async list(request: Request, response: Response): Promise<void> {
    const pagination = this.pagination.parse(
      request.query as Record<string, unknown>,
    );
    const result = await this.service.listProjects(pagination);
    const collection = this.collections.build({
      ...result,
      ...pagination,
      basePath: "/projects",
    });
    response.json(collection);
  }

  async get(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const project = await this.service.getProject(uuid);
    response.json(project);
  }

  async update(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const project = await this.service.updateProject(uuid, request.body);
    response.json(project);
  }

  async getCredential(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const credential = await this.service.getCredential(uuid);
    response.json(credential);
  }
}
