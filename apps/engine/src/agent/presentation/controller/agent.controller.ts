import type { Request, Response } from "express";

import type { HydraCollectionBuilder } from "@/shared/application/pagination/hydra-collection-builder.js";
import type { PaginationParser } from "@/shared/application/pagination/pagination-parser.js";
import type { AgentService } from "@/agent/application/service/agent.service.js";

export class AgentController {
  constructor(
    private readonly service: AgentService,
    private readonly pagination: PaginationParser,
    private readonly collections: HydraCollectionBuilder,
  ) {}

  async create(request: Request, response: Response): Promise<void> {
    const agent = await this.service.createAgent(request.body);
    response.status(201).json(agent);
  }

  async list(request: Request, response: Response): Promise<void> {
    const pagination = this.pagination.parse(
      request.query as Record<string, unknown>,
    );
    const result = await this.service.listAgents(pagination);
    const collection = this.collections.build({
      ...result,
      ...pagination,
      basePath: "/agents",
    });
    response.json(collection);
  }

  async get(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const agent = await this.service.getAgent(uuid);
    response.json(agent);
  }
}
