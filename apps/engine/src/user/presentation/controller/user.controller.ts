import type { Request, Response } from "express";

import type { HydraCollectionBuilder } from "@/shared/application/pagination/hydra-collection-builder.js";
import type { PaginationParser } from "@/shared/application/pagination/pagination-parser.js";
import type { UserService } from "@/user/application/service/user.service.js";

export class UserController {
  constructor(
    private readonly service: UserService,
    private readonly pagination: PaginationParser,
    private readonly collections: HydraCollectionBuilder,
  ) {}

  async create(request: Request, response: Response): Promise<void> {
    const user = await this.service.createUser(request.body);
    response.status(201).json(user);
  }

  async list(request: Request, response: Response): Promise<void> {
    const pagination = this.pagination.parse(
      request.query as Record<string, unknown>,
    );
    const result = await this.service.listUsers(pagination);
    const collection = this.collections.build({
      ...result,
      ...pagination,
      basePath: "/users",
    });
    response.json(collection);
  }

  async get(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const user = await this.service.getUser(uuid);
    response.json(user);
  }

  async update(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const user = await this.service.updateUser(uuid, request.body);
    response.json(user);
  }
}
