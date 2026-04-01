import "dotenv/config";

import express from "express";
import { apiReference } from "@scalar/express-api-reference";

import { db } from "./shared/database/index.js";
import { errorHandler } from "./shared/middleware/error-handler.js";
import { openApiSpec } from "./shared/openapi/index.js";

import { DrizzleProjectRepository } from "./projects/projects.repository.js";
import { ProjectService } from "./projects/projects.service.js";
import { createProjectRoutes } from "./projects/projects.routes.js";

const app = express();
const port = process.env["PORT"] ?? 3000;

app.use(express.json());

// Dependency wiring
const projectRepository = new DrizzleProjectRepository(db);
const projectService = new ProjectService(projectRepository);

// Routes
app.use(createProjectRoutes(projectService));

// OpenAPI
app.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});
app.use(
  "/docs",
  apiReference({
    content: openApiSpec,
  }),
);

// Health
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handling
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Casper Engine listening on port ${port}`);
});
