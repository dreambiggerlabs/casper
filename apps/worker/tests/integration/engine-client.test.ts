import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { EngineClient } from "../../src/engine-client.js";

// We need to import from the engine app's test helpers
// Since this is a separate workspace, we reference the engine path directly
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
let engineClient: EngineClient;

server = await startTestServer(db);
engineClient = new EngineClient(server.baseUrl);

afterAll(async () => {
  await server.close();
  await closeTestDatabase(dbClient);
});

beforeEach(async () => {
  await truncateAllTables(db);
  resetFixtureCounter();
});

describe("EngineClient (integration)", () => {
  describe("registerWorker", () => {
    it("should register a worker and return worker object", async () => {
      const worker = await engineClient.registerWorker("Test Worker");

      expect(worker.uuid).toBeDefined();
      expect(worker["@id"]).toBe(`/workers/${worker.uuid}`);
      expect(worker.name).toBe("Test Worker");
    });

    it("should register a worker with auto-generated name", async () => {
      const worker = await engineClient.registerWorker();

      expect(worker.uuid).toBeDefined();
      expect(worker.name).toBeDefined();
    });
  });

  describe("heartbeat", () => {
    it("should send heartbeat and return updated worker", async () => {
      const worker = await engineClient.registerWorker("HB Worker");
      const result = await engineClient.heartbeat(worker.uuid);

      expect(result.uuid).toBe(worker.uuid);
      expect(result.lastHeartbeatAt).toBeDefined();
    });
  });

  describe("claimTask", () => {
    it("should claim a ready task with agent", async () => {
      const project = await createTestProject(db);
      const agent = await createTestAgent(db);
      await createTestTask(db, {
        projectId: project.uuid,
        assignee: { type: "agent", uuid: agent.uuid },
        status: "ready",
      });

      const worker = await engineClient.registerWorker("Claimer");
      const result = await engineClient.claimTask(worker.uuid);

      expect(result).not.toBeNull();
      expect(result!.task.status).toBe("in_progress");
      expect(result!.job.type).toBe("execute_task");
    });

    it("should return null when no tasks available", async () => {
      const worker = await engineClient.registerWorker("Empty");
      const result = await engineClient.claimTask(worker.uuid);

      expect(result).toBeNull();
    });

    it("should return null for ready task without agent", async () => {
      const project = await createTestProject(db);
      await createTestTask(db, {
        projectId: project.uuid,
        status: "ready",
        // no agent
      });

      const worker = await engineClient.registerWorker("No Agent");
      const result = await engineClient.claimTask(worker.uuid);

      expect(result).toBeNull();
    });
  });

  describe("fetchPendingJobs", () => {
    it("should return pending jobs for a worker", async () => {
      const project = await createTestProject(db);
      const agent = await createTestAgent(db);
      await createTestTask(db, {
        projectId: project.uuid,
        assignee: { type: "agent", uuid: agent.uuid },
        status: "ready",
      });

      const worker = await engineClient.registerWorker("Fetcher");
      await engineClient.claimTask(worker.uuid);

      const jobs = await engineClient.fetchPendingJobs(worker.uuid);
      expect(jobs).toHaveLength(1);
      expect(jobs[0]!.status).toBe("ready");
    });
  });

  describe("updateJobStatus", () => {
    it("should update job status", async () => {
      const project = await createTestProject(db);
      const agent = await createTestAgent(db);
      await createTestTask(db, {
        projectId: project.uuid,
        assignee: { type: "agent", uuid: agent.uuid },
        status: "ready",
      });

      const worker = await engineClient.registerWorker("Status Worker");
      const claimed = await engineClient.claimTask(worker.uuid);

      const updated = await engineClient.updateJobStatus(
        claimed!.job.uuid,
        "in_progress",
      );
      expect(updated.status).toBe("in_progress");
    });

    it("should update job status to failed with reason", async () => {
      const project = await createTestProject(db);
      const agent = await createTestAgent(db);
      await createTestTask(db, {
        projectId: project.uuid,
        assignee: { type: "agent", uuid: agent.uuid },
        status: "ready",
      });

      const worker = await engineClient.registerWorker("Fail Worker");
      const claimed = await engineClient.claimTask(worker.uuid);

      const updated = await engineClient.updateJobStatus(
        claimed!.job.uuid,
        "failed",
        "OOM killed",
      );
      expect(updated.status).toBe("failed");
      expect(updated.failReason).toBe("OOM killed");
    });
  });

  describe("getProject", () => {
    it("should get a project by uuid", async () => {
      const project = await createTestProject(db);

      const fetched = await engineClient.getProject(project.uuid);
      expect(fetched.uuid).toBe(project.uuid);
    });

    it("should return repositoryUrl when set", async () => {
      const project = await createTestProject(db, {
        repositoryUrl: "https://github.com/org/repo.git",
      });

      const fetched = await engineClient.getProject(project.uuid);
      expect(fetched.repositoryUrl).toBe("https://github.com/org/repo.git");
    });

    it("should return null repositoryUrl when not set", async () => {
      const project = await createTestProject(db);

      const fetched = await engineClient.getProject(project.uuid);
      expect(fetched.repositoryUrl).toBeNull();
    });
  });

  describe("getTask", () => {
    it("should get a task by uuid", async () => {
      const project = await createTestProject(db);
      const task = await createTestTask(db, {
        title: "Fetch Me",
        projectId: project.uuid,
      });

      const fetched = await engineClient.getTask(task.uuid);
      expect(fetched.uuid).toBe(task.uuid);
      expect(fetched.title).toBe("Fetch Me");
    });
  });

  describe("updateTaskStatus", () => {
    it("should update a task status", async () => {
      const project = await createTestProject(db);
      const task = await createTestTask(db, {
        projectId: project.uuid,
      });

      const updated = await engineClient.updateTaskStatus(
        task.uuid,
        "ready",
      );
      expect(updated.status).toBe("ready");
    });
  });
});
