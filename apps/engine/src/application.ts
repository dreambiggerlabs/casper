import express from "express";
import { apiReference } from "@scalar/express-api-reference";
import { createServer, type Server } from "http";

import { EnvConfig } from "@/shared/infrastructure/config/env-config.js";
import { DatabaseConnection } from "@/shared/infrastructure/database/database-connection.js";
import { EncryptionService } from "@/shared/infrastructure/crypto/encryption.service.js";
import { Logger } from "@/shared/infrastructure/logging/logger.js";
import { OpenApiSpec } from "@/shared/infrastructure/openapi/openapi-spec.js";
import { ErrorHandlerMiddleware } from "@/shared/presentation/middleware/error-handler.middleware.js";
import { WorkerAuthMiddleware } from "@/worker/presentation/middleware/worker-auth.middleware.js";
import { ReferenceResolver } from "@/shared/application/reference/reference-resolver.js";
import { PaginationParser } from "@/shared/application/pagination/pagination-parser.js";
import { HydraCollectionBuilder } from "@/shared/application/pagination/hydra-collection-builder.js";
import { IriParser } from "@/shared/domain/iri/iri-parser.js";

import { DrizzleProjectRepository } from "@/project/infrastructure/repository/drizzle-project.repository.js";
import { ProjectMapper } from "@/project/infrastructure/mapper/project.mapper.js";
import { ProjectService } from "@/project/application/service/project.service.js";
import { ProjectController } from "@/project/presentation/controller/project.controller.js";
import { ProjectRouter } from "@/project/presentation/router/project.router.js";

import { DrizzleAgentRepository } from "@/agent/infrastructure/repository/drizzle-agent.repository.js";
import { AgentMapper } from "@/agent/infrastructure/mapper/agent.mapper.js";
import { AgentService } from "@/agent/application/service/agent.service.js";
import { AgentController } from "@/agent/presentation/controller/agent.controller.js";
import { AgentRouter } from "@/agent/presentation/router/agent.router.js";

import { DrizzleUserRepository } from "@/user/infrastructure/repository/drizzle-user.repository.js";
import { UserMapper } from "@/user/infrastructure/mapper/user.mapper.js";
import { UserService } from "@/user/application/service/user.service.js";
import { UserController } from "@/user/presentation/controller/user.controller.js";
import { UserRouter } from "@/user/presentation/router/user.router.js";

import { DrizzleTaskRepository } from "@/task/infrastructure/repository/drizzle-task.repository.js";
import { TaskMapper } from "@/task/infrastructure/mapper/task.mapper.js";
import { TaskService } from "@/task/application/service/task.service.js";
import { TaskController } from "@/task/presentation/controller/task.controller.js";
import { TaskRouter } from "@/task/presentation/router/task.router.js";

import { DrizzleWorkerRepository } from "@/worker/infrastructure/repository/drizzle-worker.repository.js";
import { DrizzleWorkerJobRepository } from "@/worker/infrastructure/repository/drizzle-worker-job.repository.js";
import { WorkerMapper } from "@/worker/infrastructure/mapper/worker.mapper.js";
import { WorkerJobMapper } from "@/worker/infrastructure/mapper/worker-job.mapper.js";
import { WorkerService } from "@/worker/application/service/worker.service.js";
import { WorkerController } from "@/worker/presentation/controller/worker.controller.js";
import { WorkerRouter } from "@/worker/presentation/router/worker.router.js";

export class Application {
  readonly httpServer: Server;

  constructor(env: EnvConfig) {
    // Infrastructure
    const databaseConnection = new DatabaseConnection(env.databaseUrl);
    const db = databaseConnection.db;
    const encryption = new EncryptionService(env.encryptionKey);
    const logger = new Logger({
      level: env.logLevel,
      pretty: env.isDevelopment,
    });

    // Mappers
    const projectMapper = new ProjectMapper();
    const agentMapper = new AgentMapper();
    const userMapper = new UserMapper();
    const taskMapper = new TaskMapper();
    const workerMapper = new WorkerMapper();
    const workerJobMapper = new WorkerJobMapper();

    // Repositories
    const projectRepository = new DrizzleProjectRepository(
      db,
      encryption,
      projectMapper,
    );
    const agentRepository = new DrizzleAgentRepository(db, agentMapper);
    const userRepository = new DrizzleUserRepository(db, userMapper);
    const taskRepository = new DrizzleTaskRepository(db, taskMapper);
    const workerRepository = new DrizzleWorkerRepository(db, workerMapper);
    const workerJobRepository = new DrizzleWorkerJobRepository(
      db,
      workerJobMapper,
    );

    // Cross-domain reference resolvers
    const projectResolver = new ReferenceResolver({
      projects: projectRepository,
    });
    const assigneeResolver = new ReferenceResolver({
      agents: agentRepository,
      users: userRepository,
    });

    // Services
    const projectService = new ProjectService(projectRepository);
    const agentService = new AgentService(agentRepository);
    const userService = new UserService(userRepository);
    const taskService = new TaskService(
      taskRepository,
      projectResolver,
      assigneeResolver,
    );
    const workerService = new WorkerService(
      workerRepository,
      workerJobRepository,
    );

    // Middleware
    const workerAuth = new WorkerAuthMiddleware(workerRepository);
    const errorHandler = new ErrorHandlerMiddleware(logger);

    // Presentation helpers
    const paginationParser = new PaginationParser();
    const collectionBuilder = new HydraCollectionBuilder();
    const iriParser = new IriParser();

    // Controllers
    const projectController = new ProjectController(
      projectService,
      paginationParser,
      collectionBuilder,
    );
    const agentController = new AgentController(
      agentService,
      paginationParser,
      collectionBuilder,
    );
    const userController = new UserController(
      userService,
      paginationParser,
      collectionBuilder,
    );
    const taskController = new TaskController(
      taskService,
      paginationParser,
      collectionBuilder,
      iriParser,
    );
    const workerController = new WorkerController(
      workerService,
      paginationParser,
      collectionBuilder,
      iriParser,
    );

    // Routers
    const projectRouter = new ProjectRouter(
      projectController,
      workerAuth.handle(),
    );
    const agentRouter = new AgentRouter(agentController);
    const userRouter = new UserRouter(userController);
    const taskRouter = new TaskRouter(taskController);
    const workerRouter = new WorkerRouter(
      workerController,
      workerAuth.handle(),
    );

    // Express app
    const app = express();
    app.use(express.json());

    app.use(projectRouter.build());
    app.use(agentRouter.build());
    app.use(userRouter.build());
    app.use(taskRouter.build());
    app.use(workerRouter.build());

    const openApiSpec = new OpenApiSpec();
    app.get("/openapi.json", (_request, response) => {
      response.json(openApiSpec.build());
    });
    app.use(
      "/docs",
      apiReference({
        content: openApiSpec.build(),
      }),
    );

    app.get("/health", (_request, response) => {
      response.json({ status: "ok" });
    });

    app.use(errorHandler.handle());

    this.httpServer = createServer(app);
  }

  listen(port: number): void {
    this.httpServer.listen(port);
  }
}
