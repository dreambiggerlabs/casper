import { Router } from "express";

import type { ProjectService } from "./projects.service.js";

export function createProjectRoutes(service: ProjectService): Router {
  const router = Router();

  router.post("/projects", async (req, res) => {
    const project = await service.createProject(req.body);
    res.status(201).json(project);
  });

  router.get("/projects", async (_req, res) => {
    const projects = await service.listProjects();
    res.json(projects);
  });

  router.get("/projects/:uuid", async (req, res) => {
    const uuid = req.params["uuid"] ?? "";
    const project = await service.getProject(uuid);
    res.json(project);
  });

  router.patch("/projects/:uuid", async (req, res) => {
    const uuid = req.params["uuid"] ?? "";
    const project = await service.updateProject(uuid, req.body);
    res.json(project);
  });

  return router;
}
