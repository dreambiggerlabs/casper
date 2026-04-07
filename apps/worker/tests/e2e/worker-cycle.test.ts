import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { EngineClient } from "../../src/engine-client.js";
import { JobProcessor } from "../../src/job-processor.js";
import { PollingLoop } from "../../src/polling-loop.js";

import { startTestServer } from "../../../engine/tests/helpers/create-app.js";
import type { TestServer } from "../../../engine/tests/helpers/create-app.js";
import {
  createTestDatabase,
  truncateAllTables,
  closeTestDatabase,
} from "../../../engine/tests/helpers/test-database.js";
import {
  createTestProject,
  createTestAgent,
  createTestTask,
  resetFixtureCounter,
} from "../../../engine/tests/helpers/fixtures.js";

const { db, client: dbClient } = await createTestDatabase();
let server: TestServer;

server = await startTestServer(db);

afterAll(async () => {
  await server.close();
  await closeTestDatabase(dbClient);
});

beforeEach(async () => {
  await truncateAllTables(db);
  resetFixtureCounter();
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("Worker polling cycle (E2E)", () => {
  it("should claim and process a task through the full lifecycle", async () => {
    // Seed data
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    const task = await createTestTask(db, {
      title: "E2E Cycle Task",
      projectId: project.uuid,
      agentId: agent.uuid,
      status: "ready",
    });

    // Create worker components
    const engineClient = new EngineClient(server.baseUrl);
    const worker = await engineClient.registerWorker("E2E Cycle Worker");
    const jobProcessor = new JobProcessor(engineClient);
    const pollingLoop = new PollingLoop(
      engineClient,
      jobProcessor,
      worker.uuid,
    );

    // Start polling
    pollingLoop.start();

    // Wait for the task to be processed (polling interval is 5s, give extra time)
    const maxWait = 15000;
    const checkInterval = 500;
    let elapsed = 0;
    let finalTask = await engineClient.getTask(task.uuid);

    while (finalTask.status !== "review" && elapsed < maxWait) {
      await sleep(checkInterval);
      elapsed += checkInterval;
      finalTask = await engineClient.getTask(task.uuid);
    }

    // Stop polling
    pollingLoop.stop();

    // Task should have moved through: ready → in_progress → review
    expect(finalTask.status).toBe("review");
  });

  it("should idle when no tasks are available", async () => {
    const engineClient = new EngineClient(server.baseUrl);
    const worker = await engineClient.registerWorker("Idle Worker");
    const jobProcessor = new JobProcessor(engineClient);
    const pollingLoop = new PollingLoop(
      engineClient,
      jobProcessor,
      worker.uuid,
    );

    // Start polling with no tasks available
    pollingLoop.start();

    // Let it run for a couple of poll cycles
    await sleep(2000);

    // Stop - should not throw
    pollingLoop.stop();
  });
});
