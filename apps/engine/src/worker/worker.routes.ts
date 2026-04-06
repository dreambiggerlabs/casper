import { Router } from "express";

import { parseIri } from "../shared/iri/index.js";
import {
  createHydraCollection,
  parsePaginationParams,
} from "../shared/pagination/index.js";

import type { WorkerService } from "./worker.service.js";

export function createWorkerRoutes(service: WorkerService): Router {
  const router = Router();

  // Worker endpoints
  router.post("/workers", async (request, response) => {
    const worker = await service.registerWorker(request.body);
    response.status(201).json(worker);
  });

  router.get("/workers", async (request, response) => {
    const pagination = parsePaginationParams(
      request.query as Record<string, unknown>,
    );
    const result = await service.listWorkers(pagination);
    const collection = createHydraCollection({
      ...result,
      ...pagination,
      basePath: "/workers",
    });
    response.json(collection);
  });

  router.get("/workers/:uuid", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const worker = await service.getWorker(uuid);
    response.json(worker);
  });

  router.put("/workers/:uuid/heartbeat", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const worker = await service.heartbeat(uuid);
    response.json(worker);
  });

  // Job endpoints
  router.post("/jobs", async (request, response) => {
    const job = await service.createJob(request.body);
    response.status(201).json(job);
  });

  router.get("/jobs", async (request, response) => {
    const workerIri = request.query["worker"]?.toString();
    const status = request.query["status"]?.toString() as
      | "pending"
      | "in_progress"
      | "completed"
      | "failed"
      | undefined;

    if (!workerIri) {
      response
        .status(400)
        .json({ error: "worker query parameter is required" });

      return;
    }

    const pagination = parsePaginationParams(
      request.query as Record<string, unknown>,
    );
    const workerId = parseIri(workerIri, "workers");
    const result = await service.listJobs(workerId, status, pagination);
    const extraParams: Record<string, string> = { worker: workerIri };
    if (status) extraParams["status"] = status;
    const collection = createHydraCollection({
      ...result,
      ...pagination,
      basePath: "/jobs",
      extraParams,
    });
    response.json(collection);
  });

  router.get("/jobs/:uuid", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const job = await service.getJob(uuid);
    response.json(job);
  });

  router.patch("/jobs/:uuid/status", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const job = await service.updateJobStatus(uuid, request.body);
    response.json(job);
  });

  // Task claiming endpoint
  router.post("/tasks/claim", async (request, response) => {
    const result = await service.claimTask(request.body);
    if (!result) {
      response.status(204).send();

      return;
    }
    response.status(201).json(result);
  });

  return router;
}
