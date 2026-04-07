import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { startTestServer, type TestServer } from "../../helpers/create-app.js";
import {
  createTestDatabase,
  truncateAllTables,
  closeTestDatabase,
} from "../../helpers/test-database.js";
import {
  createTestProject,
  createTestAgent,
  createTestTask,
  resetFixtureCounter,
} from "../../helpers/fixtures.js";

const { db, client } = await createTestDatabase();
let server: TestServer;

server = await startTestServer(db);

afterAll(async () => {
  await server.close();
  await closeTestDatabase(client);
});

beforeEach(async () => {
  await truncateAllTables(db);
  resetFixtureCounter();
});

describe("Worker lifecycle (E2E)", () => {
  it("should register a worker and return 201 with token", async () => {
    const response = await fetch(`${server.baseUrl}/workers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Worker" }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body["uuid"]).toBeDefined();
    expect(body["token"]).toBeDefined();
    expect(body["name"]).toBe("My Worker");
    expect(body["status"]).toBe("active");
  });

  it("should send heartbeat and update lastHeartbeatAt", async () => {
    const regRes = await fetch(`${server.baseUrl}/workers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "HB Worker" }),
    });
    const worker = (await regRes.json()) as Record<string, unknown>;

    const response = await fetch(
      `${server.baseUrl}/workers/${worker["uuid"]}/heartbeat`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body["lastHeartbeatAt"]).toBeDefined();
  });

  it("should claim a ready task with agent and return 201", async () => {
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    const task = await createTestTask(db, {
      projectId: project.uuid,
      agentId: agent.uuid,
      status: "ready",
    });

    // Register worker via API
    const regRes = await fetch(`${server.baseUrl}/workers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Claimer" }),
    });
    const worker = (await regRes.json()) as Record<string, unknown>;

    // Claim task
    const claimRes = await fetch(`${server.baseUrl}/tasks/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker: worker["@id"] }),
    });

    expect(claimRes.status).toBe(201);
    const body = (await claimRes.json()) as Record<string, unknown>;
    const claimedTask = body["task"] as Record<string, unknown>;
    const claimedJob = body["job"] as Record<string, unknown>;

    expect(claimedTask["uuid"]).toBe(task.uuid);
    expect(claimedTask["status"]).toBe("in_progress");
    expect(claimedJob["worker"]).toBe(worker["@id"]);
    expect(claimedJob["type"]).toBe("execute_task");
  });

  it("should return 204 when no tasks available to claim", async () => {
    const regRes = await fetch(`${server.baseUrl}/workers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Empty Claimer" }),
    });
    const worker = (await regRes.json()) as Record<string, unknown>;

    const claimRes = await fetch(`${server.baseUrl}/tasks/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker: worker["@id"] }),
    });

    expect(claimRes.status).toBe(204);
  });

  it("should NOT claim a ready task without agent (204)", async () => {
    const project = await createTestProject(db);
    // Task is ready but no agent assigned
    await createTestTask(db, {
      projectId: project.uuid,
      status: "ready",
    });

    const regRes = await fetch(`${server.baseUrl}/workers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Agent Claimer" }),
    });
    const worker = (await regRes.json()) as Record<string, unknown>;

    const claimRes = await fetch(`${server.baseUrl}/tasks/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker: worker["@id"] }),
    });

    expect(claimRes.status).toBe(204);
  });

  it("should complete full workflow: register → heartbeat → claim → update job status", async () => {
    // Setup data
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    await createTestTask(db, {
      projectId: project.uuid,
      agentId: agent.uuid,
      status: "ready",
    });

    // Register worker
    const regRes = await fetch(`${server.baseUrl}/workers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Full Workflow Worker" }),
    });
    const worker = (await regRes.json()) as Record<string, unknown>;

    // Heartbeat
    await fetch(`${server.baseUrl}/workers/${worker["uuid"]}/heartbeat`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    // Claim task
    const claimRes = await fetch(`${server.baseUrl}/tasks/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker: worker["@id"] }),
    });
    expect(claimRes.status).toBe(201);
    const claimed = (await claimRes.json()) as Record<string, unknown>;
    const job = claimed["job"] as Record<string, unknown>;

    // Update job to in_progress
    const ipRes = await fetch(
      `${server.baseUrl}/jobs/${job["uuid"]}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      },
    );
    expect(ipRes.status).toBe(200);

    // Update job to completed
    const compRes = await fetch(
      `${server.baseUrl}/jobs/${job["uuid"]}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      },
    );
    expect(compRes.status).toBe(200);
    const completedJob = (await compRes.json()) as Record<string, unknown>;
    expect(completedJob["status"]).toBe("completed");
  });

  it("should list jobs for a worker in Hydra format", async () => {
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    await createTestTask(db, {
      projectId: project.uuid,
      agentId: agent.uuid,
      status: "ready",
    });

    // Register and claim
    const regRes = await fetch(`${server.baseUrl}/workers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "List Jobs Worker" }),
    });
    const worker = (await regRes.json()) as Record<string, unknown>;

    await fetch(`${server.baseUrl}/tasks/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker: worker["@id"] }),
    });

    // List jobs
    const response = await fetch(
      `${server.baseUrl}/jobs?worker=${encodeURIComponent(worker["@id"] as string)}`,
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body["@type"]).toBe("Collection");
    expect(body["totalItems"]).toBe(1);
  });

  it("should update job status to failed with failReason", async () => {
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    await createTestTask(db, {
      projectId: project.uuid,
      agentId: agent.uuid,
      status: "ready",
    });

    const regRes = await fetch(`${server.baseUrl}/workers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Fail Worker" }),
    });
    const worker = (await regRes.json()) as Record<string, unknown>;

    const claimRes = await fetch(`${server.baseUrl}/tasks/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worker: worker["@id"] }),
    });
    const claimed = (await claimRes.json()) as Record<string, unknown>;
    const job = claimed["job"] as Record<string, unknown>;

    const failRes = await fetch(
      `${server.baseUrl}/jobs/${job["uuid"]}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "failed",
          failReason: "Out of memory",
        }),
      },
    );
    expect(failRes.status).toBe(200);

    const failedJob = (await failRes.json()) as Record<string, unknown>;
    expect(failedJob["status"]).toBe("failed");
    expect(failedJob["failReason"]).toBe("Out of memory");
  });
});
