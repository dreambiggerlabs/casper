import { Router } from "express";

import { parseIri } from "../shared/iri/index.js";

import type { TaskService } from "./task.service.js";

export function createTaskRoutes(service: TaskService): Router {
  const router = Router();

  router.post("/tasks", async (request, response) => {
    const task = await service.createTask(request.body);
    response.status(201).json(task);
  });

  router.get("/tasks", async (request, response) => {
    const agentIri = request.query["agent"]?.toString();
    const tasks = await service.listTasks({
      status: request.query["status"]?.toString(),
      agentId: agentIri ? parseIri(agentIri, "agents") : undefined,
    });
    response.json(tasks);
  });

  router.get("/tasks/:uuid", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const task = await service.getTask(uuid);
    response.json(task);
  });

  router.get("/projects/:projectId/tasks", async (request, response) => {
    const projectId = request.params["projectId"] ?? "";
    const tasks = await service.listTasksByProject(projectId);
    response.json(tasks);
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
