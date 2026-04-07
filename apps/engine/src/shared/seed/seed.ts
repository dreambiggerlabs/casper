/**
 * Development seed script.
 *
 * Populates the database with a realistic dataset for local development:
 * - 2 projects
 * - 3 agents
 * - 10 tasks across various statuses (some assigned, some not)
 * - 1 worker
 *
 * Usage: npm run db:seed
 */
import "dotenv/config";

import { db } from "../database/index.js";
import { logger } from "../logging/logger.js";
import {
  createProject,
  createAgent,
  createTask,
  createWorker,
} from "./factories.js";

async function seed() {
  logger.info("Seeding database...");

  // Projects
  const webApp = await createProject(db, {
    title: "Web Application",
    description: "Main customer-facing web application",
  });
  const infrastructure = await createProject(db, {
    title: "Infrastructure",
    description: "DevOps and platform tooling",
  });
  logger.info(
    { projects: [webApp.uuid, infrastructure.uuid] },
    "Created projects",
  );

  // Agents
  const coder = await createAgent(db, { name: "Coder" });
  const reviewer = await createAgent(db, { name: "Reviewer" });
  const devops = await createAgent(db, { name: "DevOps" });
  logger.info(
    { agents: [coder.uuid, reviewer.uuid, devops.uuid] },
    "Created agents",
  );

  // Web App tasks — various statuses
  await createTask(db, {
    title: "Set up authentication",
    projectId: webApp.uuid,
    agentId: coder.uuid,
    status: "completed",
  });
  await createTask(db, {
    title: "Build user dashboard",
    projectId: webApp.uuid,
    agentId: coder.uuid,
    status: "in_progress",
  });
  await createTask(db, {
    title: "Add email notifications",
    projectId: webApp.uuid,
    agentId: coder.uuid,
    status: "ready",
  });
  await createTask(db, {
    title: "Review security headers",
    projectId: webApp.uuid,
    agentId: reviewer.uuid,
    status: "review",
  });
  await createTask(db, {
    title: "Write API documentation",
    projectId: webApp.uuid,
    status: "backlog",
    // no agent — not yet assigned
  });
  await createTask(db, {
    title: "Performance testing",
    projectId: webApp.uuid,
    status: "backlog",
  });

  // Infrastructure tasks
  await createTask(db, {
    title: "Set up CI/CD pipeline",
    projectId: infrastructure.uuid,
    agentId: devops.uuid,
    status: "completed",
  });
  await createTask(db, {
    title: "Configure monitoring",
    projectId: infrastructure.uuid,
    agentId: devops.uuid,
    status: "ready",
  });
  await createTask(db, {
    title: "Set up staging environment",
    projectId: infrastructure.uuid,
    agentId: devops.uuid,
    status: "in_progress",
  });
  await createTask(db, {
    title: "Database backup automation",
    projectId: infrastructure.uuid,
    status: "backlog",
  });

  logger.info("Created 10 tasks across 2 projects");

  // Worker
  const worker = await createWorker(db, { name: "Dev Worker" });
  logger.info({ workerId: worker.uuid }, "Created worker");

  logger.info("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, "Seed failed");
  process.exit(1);
});
