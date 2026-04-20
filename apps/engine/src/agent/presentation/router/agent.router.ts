import { Router } from "express";

import type { AgentController } from "@/agent/presentation/controller/agent.controller.js";

export class AgentRouter {
  constructor(private readonly controller: AgentController) {}

  build(): Router {
    const router = Router();

    router.post("/agents", (req, res) => this.controller.create(req, res));
    router.get("/agents", (req, res) => this.controller.list(req, res));
    router.get("/agents/:uuid", (req, res) => this.controller.get(req, res));

    return router;
  }
}
