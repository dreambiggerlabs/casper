import { Router } from "express";

import type { WorkerService } from "./worker.service.js";

export function createWorkerRoutes(service: WorkerService): Router {
  const router = Router();

  // Worker endpoints
  router.post("/workers", async (request, response) => {
    const worker = await service.registerWorker(request.body);
    response.status(201).json(worker);
  });

  router.get("/workers", async (_request, response) => {
    const workers = await service.listWorkers();
    response.json(workers);
  });

  router.get("/workers/:uuid", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const worker = await service.getWorker(uuid);
    response.json(worker);
  });

  router.put("/workers/:uuid/heartbeat", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const worker = await service.heartbeat(uuid, request.body);
    response.json(worker);
  });

  // Job endpoints
  router.post("/jobs", async (request, response) => {
    const { workerId, ...jobData } = request.body;
    const job = await service.createJob(workerId, jobData);
    response.status(201).json(job);
  });

  router.get("/jobs", async (request, response) => {
    const workerId = request.query["workerId"]?.toString();
    const status = request.query["status"]?.toString() as
      | "pending"
      | "in_progress"
      | "completed"
      | "failed"
      | undefined;

    if (!workerId) {
      response.status(400).json({ error: "workerId query parameter is required" });
      return;
    }

    const jobs = await service.listJobs(workerId, status);
    response.json(jobs);
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

  return router;
}