import { Router } from "express";

import type { TaskController } from "@/task/presentation/controller/task.controller.js";

export class TaskRouter {
  constructor(private readonly controller: TaskController) {}

  build(): Router {
    const router = Router();

    router.post("/tasks", (req, res) => this.controller.create(req, res));
    router.get("/tasks", (req, res) => this.controller.list(req, res));
    router.get("/tasks/:uuid", (req, res) => this.controller.get(req, res));
    router.get("/projects/:projectId/tasks", (req, res) =>
      this.controller.listByProject(req, res),
    );
    router.patch("/tasks/:uuid", (req, res) =>
      this.controller.update(req, res),
    );
    router.post("/tasks/:uuid/assign", (req, res) =>
      this.controller.assign(req, res),
    );
    router.patch("/tasks/:uuid/status", (req, res) =>
      this.controller.updateStatus(req, res),
    );

    return router;
  }
}
