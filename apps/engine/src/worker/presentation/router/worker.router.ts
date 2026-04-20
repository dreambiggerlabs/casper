import { Router, type RequestHandler } from "express";

import type { WorkerController } from "@/worker/presentation/controller/worker.controller.js";

export class WorkerRouter {
  constructor(
    private readonly controller: WorkerController,
    private readonly workerAuth: RequestHandler,
  ) {}

  build(): Router {
    const router = Router();

    router.post("/workers", (req, res) => this.controller.register(req, res));
    router.get("/workers", (req, res) => this.controller.list(req, res));
    router.get("/workers/:uuid", (req, res) => this.controller.get(req, res));
    router.put("/workers/:uuid/heartbeat", (req, res) =>
      this.controller.heartbeat(req, res),
    );

    router.post("/jobs", this.workerAuth, (req, res) =>
      this.controller.createJob(req, res),
    );
    router.get("/jobs", (req, res) => this.controller.listJobs(req, res));
    router.get("/jobs/:uuid", (req, res) => this.controller.getJob(req, res));
    router.patch("/jobs/:uuid/status", this.workerAuth, (req, res) =>
      this.controller.updateJobStatus(req, res),
    );

    router.post("/tasks/claim", this.workerAuth, (req, res) =>
      this.controller.claimTask(req, res),
    );

    return router;
  }
}
