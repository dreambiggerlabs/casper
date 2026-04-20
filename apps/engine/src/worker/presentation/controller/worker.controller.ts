import type { Request, Response } from "express";

import type { HydraCollectionBuilder } from "@/shared/application/pagination/hydra-collection-builder.js";
import type { PaginationParser } from "@/shared/application/pagination/pagination-parser.js";
import type { IriParser } from "@/shared/domain/iri/iri-parser.js";
import type { JobStatus } from "@/worker/domain/value-object/job-status.value-object.js";
import type { WorkerService } from "@/worker/application/service/worker.service.js";

export class WorkerController {
  constructor(
    private readonly service: WorkerService,
    private readonly pagination: PaginationParser,
    private readonly collections: HydraCollectionBuilder,
    private readonly iriParser: IriParser,
  ) {}

  async register(request: Request, response: Response): Promise<void> {
    const worker = await this.service.registerWorker(request.body);
    response.status(201).json(worker);
  }

  async list(request: Request, response: Response): Promise<void> {
    const pagination = this.pagination.parse(
      request.query as Record<string, unknown>,
    );
    const result = await this.service.listWorkers(pagination);
    const collection = this.collections.build({
      ...result,
      ...pagination,
      basePath: "/workers",
    });
    response.json(collection);
  }

  async get(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const worker = await this.service.getWorker(uuid);
    response.json(worker);
  }

  async heartbeat(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const worker = await this.service.heartbeat(uuid);
    response.json(worker);
  }

  async createJob(request: Request, response: Response): Promise<void> {
    const job = await this.service.createJob(request.body);
    response.status(201).json(job);
  }

  async listJobs(request: Request, response: Response): Promise<void> {
    const workerIri = request.query["worker"]?.toString();
    const status = request.query["status"]?.toString() as JobStatus | undefined;

    if (!workerIri) {
      response
        .status(400)
        .json({ error: "worker query parameter is required" });

      return;
    }

    const pagination = this.pagination.parse(
      request.query as Record<string, unknown>,
    );
    const workerId = this.iriParser.parse(workerIri, "workers");
    const result = await this.service.listJobs(workerId, status, pagination);
    const extraParams: Record<string, string> = { worker: workerIri };
    if (status) extraParams["status"] = status;
    const collection = this.collections.build({
      ...result,
      ...pagination,
      basePath: "/jobs",
      extraParams,
    });
    response.json(collection);
  }

  async getJob(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const job = await this.service.getJob(uuid);
    response.json(job);
  }

  async updateJobStatus(request: Request, response: Response): Promise<void> {
    const uuid = String(request.params["uuid"] ?? "");
    const job = await this.service.updateJobStatus(uuid, request.body);
    response.json(job);
  }

  async claimTask(request: Request, response: Response): Promise<void> {
    const result = await this.service.claimTask(request.body);
    if (!result) {
      response.status(204).send();

      return;
    }
    response.status(201).json(result);
  }
}
