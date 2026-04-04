import { Router } from "express";

import {
  createHydraCollection,
  parsePaginationParams,
} from "../shared/pagination/index.js";

import type { AgentService } from "./agent.service.js";

export function createAgentRoutes(service: AgentService): Router {
  const router = Router();

  router.post("/agents", async (request, response) => {
    const agent = await service.createAgent(request.body);
    response.status(201).json(agent);
  });

  router.get("/agents", async (request, response) => {
    const pagination = parsePaginationParams(
      request.query as Record<string, unknown>,
    );
    const result = await service.listAgents(pagination);
    const collection = createHydraCollection({
      ...result,
      ...pagination,
      basePath: "/agents",
    });
    response.json(collection);
  });

  router.get("/agents/:uuid", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const agent = await service.getAgent(uuid);
    response.json(agent);
  });

  return router;
}
