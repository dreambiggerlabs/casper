import { Router } from "express";

import type { TaskService } from "./task.service.js";

export function createTaskRoutes(service: TaskService): Router {
  const router = Router();

  router.post("/tasks", async (request, response) => {
    const task = await service.createTask(request.body);
    response.status(201).json(task);
  });

  router.get("/tasks", async (_request, response) => {
    const tasks = await service.listTasks();
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

  return router;
}
