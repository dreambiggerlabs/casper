import { Router, type RequestHandler } from "express";

import type { ProjectController } from "@/project/presentation/controller/project.controller.js";

export class ProjectRouter {
  constructor(
    private readonly controller: ProjectController,
    private readonly workerAuth: RequestHandler,
  ) {}

  build(): Router {
    const router = Router();

    router.post("/projects", (req, res) => this.controller.create(req, res));
    router.get("/projects", (req, res) => this.controller.list(req, res));
    router.get("/projects/:uuid", (req, res) => this.controller.get(req, res));
    router.patch("/projects/:uuid", (req, res) =>
      this.controller.update(req, res),
    );
    router.get("/projects/:uuid/credential", this.workerAuth, (req, res) =>
      this.controller.getCredential(req, res),
    );

    return router;
  }
}
