import type { Request, Response } from "express";

import type { HydraCollectionBuilder } from "@/shared/application/pagination/hydra-collection-builder.js";
import type { PaginationParser } from "@/shared/application/pagination/pagination-parser.js";
import { ValidationError } from "@/shared/domain/error/validation.error.js";
import type { IriParser } from "@/shared/domain/iri/iri-parser.js";
import type { TaskService } from "@/task/application/service/task.service.js";
import type { AssigneeRef } from "@/task/domain/value-object/assignee.value-object.js";

export class TaskController {
  constructor(
    private readonly service: TaskService,
    private readonly pagination: PaginationParser,
    private readonly collections: HydraCollectionBuilder,
    private readonly iriParser: IriParser,
  ) {}

  async create(request: Request, response: Response): Promise<void> {
    const task = await this.service.createTask(request.body);
    response.status(201).json(task);
  }

  async list(request: Request, response: Response): Promise<void> {
    const pagination = this.pagination.parse(
      request.query as Record<string, unknown>,
    );
    const status = request.query["status"]?.toString();
    const assigneeIri = request.query["assignee"]?.toString();
    const assignee = assigneeIri ? this.parseAssignee(assigneeIri) : undefined;

    const result = await this.service.listTasks(
      { status, assignee },
      pagination,
    );

    const extraParams: Record<string, string> = {};
    if (status) extraParams["status"] = status;
    if (assigneeIri) extraParams["assignee"] = assigneeIri;
    const collection = this.collections.build({
      ...result,
      ...pagination,
      basePath: "/tasks",
      extraParams:
        Object.keys(extraParams).length > 0 ? extraParams : undefined,
    });
    response.json(collection);
  }

  async get(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const task = await this.service.getTask(uuid);
    response.json(task);
  }

  async listByProject(request: Request, response: Response): Promise<void> {
    const projectId = String(request.params["projectId"] ?? "");
    const pagination = this.pagination.parse(
      request.query as Record<string, unknown>,
    );
    const result = await this.service.listTasksByProject(projectId, pagination);
    const collection = this.collections.build({
      ...result,
      ...pagination,
      basePath: `/projects/${projectId}/tasks`,
    });
    response.json(collection);
  }

  async update(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const task = await this.service.updateTask(uuid, request.body);
    response.json(task);
  }

  async assign(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const task = await this.service.assignTask(uuid, request.body);
    response.json(task);
  }

  async updateStatus(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const task = await this.service.updateTaskStatus(uuid, request.body);
    response.json(task);
  }

  private parseAssignee(iri: string): AssigneeRef {
    try {
      const parsed = this.iriParser.parsePolymorphic(iri, [
        "agents",
        "users",
      ] as const);

      return {
        type: parsed.resource === "agents" ? "agent" : "user",
        uuid: parsed.uuid,
      };
    } catch {
      throw new ValidationError("Invalid assignee IRI", [
        {
          field: "assignee",
          message:
            "Must be a valid IRI in the format /agents/{uuid} | /users/{uuid}",
        },
      ]);
    }
  }
}
