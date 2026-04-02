import { Router } from "express";

import type { AgentService } from "./agent.service.js";

export function createAgentRoutes(service: AgentService): Router {
  const router = Router();

  router.post("/agents", async (request, response) => {
    const agent = await service.createAgent(request.body);
    response.status(201).json(agent);
  });

  router.get("/agents", async (_request, response) => {
    const agents = await service.listAgents();
    response.json(agents);
  });

  router.get("/agents/:uuid", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const agent = await service.getAgent(uuid);
    response.json(agent);
  });

  return router;
}
