import express from "express";
import { apiReference } from "@scalar/express-api-reference";

import type { Database } from "./shared/database/index.js";
import { errorHandler } from "./shared/middleware/error-handler.js";
import { workerAuthMiddleware } from "./shared/middleware/worker-auth.js";
import { openApiSpec } from "./shared/openapi/index.js";

import { DrizzleProjectRepository } from "./project/project.repository.js";
import { ProjectService } from "./project/project.service.js";
import { createProjectRoutes } from "./project/project.routes.js";

import { DrizzleAgentRepository } from "./agent/agent.repository.js";
import { AgentService } from "./agent/agent.service.js";
import { createAgentRoutes } from "./agent/agent.routes.js";

import { DrizzleUserRepository } from "./user/user.repository.js";
import { UserService } from "./user/user.service.js";
import { createUserRoutes } from "./user/user.routes.js";

import {
  DrizzleWorkerRepository,
  DrizzleWorkerJobRepository,
} from "./worker/worker.repository.js";
import { WorkerService } from "./worker/worker.service.js";
import { createWorkerRoutes } from "./worker/worker.routes.js";

import { DrizzleTaskRepository } from "./task/task.repository.js";
import { TaskService } from "./task/task.service.js";
import { createTaskRoutes } from "./task/task.routes.js";

export function createApp(db: Database) {
  const app = express();

  app.use(express.json());

  // Dependency wiring
  const projectRepository = new DrizzleProjectRepository(db);
  const projectService = new ProjectService(projectRepository);

  const agentRepository = new DrizzleAgentRepository(db);
  const agentService = new AgentService(agentRepository);

  const userRepository = new DrizzleUserRepository(db);
  const userService = new UserService(userRepository);

  const workerRepository = new DrizzleWorkerRepository(db);
  const workerJobRepository = new DrizzleWorkerJobRepository(db);
  const workerService = new WorkerService(
    workerRepository,
    workerJobRepository,
    db,
  );

  const taskRepository = new DrizzleTaskRepository(db);
  const taskService = new TaskService(
    taskRepository,
    projectRepository,
    agentRepository,
    userRepository,
  );

  // Middleware
  const workerAuth = workerAuthMiddleware(workerRepository);

  // Routes
  app.use(createProjectRoutes(projectService, workerAuth));
  app.use(createAgentRoutes(agentService));
  app.use(createUserRoutes(userService));
  app.use(createWorkerRoutes(workerService));
  app.use(createTaskRoutes(taskService));

  // OpenAPI
  app.get("/openapi.json", (_request, response) => {
    response.json(openApiSpec);
  });
  app.use(
    "/docs",
    apiReference({
      content: openApiSpec,
    }),
  );

  // Health
  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  // Error handling
  app.use(errorHandler);

  return app;
}
