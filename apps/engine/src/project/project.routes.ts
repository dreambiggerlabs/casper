import { Router, type RequestHandler } from "express";

import {
  createHydraCollection,
  parsePaginationParams,
} from "../shared/pagination/index.js";

import type { ProjectService } from "./project.service.js";

export function createProjectRoutes(
  service: ProjectService,
  workerAuth: RequestHandler,
): Router {
  const router = Router();

  router.post("/projects", async (req, res) => {
    const project = await service.createProject(req.body);
    res.status(201).json(project);
  });

  router.get("/projects", async (req, res) => {
    const pagination = parsePaginationParams(
      req.query as Record<string, unknown>,
    );
    const result = await service.listProjects(pagination);
    const collection = createHydraCollection({
      ...result,
      ...pagination,
      basePath: "/projects",
    });
    res.json(collection);
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

  router.get<{ uuid: string }>(
    "/projects/:uuid/credential",
    workerAuth,
    async (req, res) => {
      const credential = await service.getCredential(req.params.uuid);
      res.json(credential);
    },
  );

  return router;
}
