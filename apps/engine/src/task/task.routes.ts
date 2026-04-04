import { Router } from "express";

import { parseIri } from "../shared/iri/index.js";
import {
  createHydraCollection,
  parsePaginationParams,
} from "../shared/pagination/index.js";

import type { TaskService } from "./task.service.js";

export function createTaskRoutes(service: TaskService): Router {
  const router = Router();

  router.post("/tasks", async (request, response) => {
    const task = await service.createTask(request.body);
    response.status(201).json(task);
  });

  router.get("/tasks", async (request, response) => {
    const pagination = parsePaginationParams(
      request.query as Record<string, unknown>,
    );
    const agentIri = request.query["agent"]?.toString();
    const status = request.query["status"]?.toString();
    const result = await service.listTasks(
      {
        status,
        agentId: agentIri ? parseIri(agentIri, "agents") : undefined,
      },
      pagination,
    );
    const extraParams: Record<string, string> = {};
    if (status) extraParams["status"] = status;
    if (agentIri) extraParams["agent"] = agentIri;
    const collection = createHydraCollection({
      ...result,
      ...pagination,
      basePath: "/tasks",
      extraParams:
        Object.keys(extraParams).length > 0 ? extraParams : undefined,
    });
    response.json(collection);
  });

  router.get("/tasks/:uuid", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const task = await service.getTask(uuid);
    response.json(task);
  });

  router.get("/projects/:projectId/tasks", async (request, response) => {
    const projectId = request.params["projectId"] ?? "";
    const pagination = parsePaginationParams(
      request.query as Record<string, unknown>,
    );
    const result = await service.listTasksByProject(projectId, pagination);
    const collection = createHydraCollection({
      ...result,
      ...pagination,
      basePath: `/projects/${projectId}/tasks`,
    });
    response.json(collection);
  });

  router.patch("/tasks/:uuid", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const task = await service.updateTask(uuid, request.body);
    response.json(task);
  });

  router.post("/tasks/:uuid/assign", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const task = await service.assignTask(uuid, request.body);
    response.json(task);
  });

  router.patch("/tasks/:uuid/status", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const task = await service.updateTaskStatus(uuid, request.body);
    response.json(task);
  });

  return router;
}
