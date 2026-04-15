import { Router } from "express";

import {
  createHydraCollection,
  parsePaginationParams,
} from "../shared/pagination/index.js";

import type { UserService } from "./user.service.js";

export function createUserRoutes(service: UserService): Router {
  const router = Router();

  router.post("/users", async (request, response) => {
    const user = await service.createUser(request.body);
    response.status(201).json(user);
  });

  router.get("/users", async (request, response) => {
    const pagination = parsePaginationParams(
      request.query as Record<string, unknown>,
    );
    const result = await service.listUsers(pagination);
    const collection = createHydraCollection({
      ...result,
      ...pagination,
      basePath: "/users",
    });
    response.json(collection);
  });

  router.get("/users/:uuid", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const user = await service.getUser(uuid);
    response.json(user);
  });

  router.patch("/users/:uuid", async (request, response) => {
    const uuid = request.params["uuid"] ?? "";
    const user = await service.updateUser(uuid, request.body);
    response.json(user);
  });

  return router;
}
