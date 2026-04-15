import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { startTestServer, type TestServer } from "../../helpers/create-app.js";
import {
  createTestDatabase,
  truncateAllTables,
  closeTestDatabase,
} from "../../helpers/test-database.js";
import { resetFixtureCounter } from "../../helpers/fixtures.js";

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

async function createProject(baseUrl: string, title = "Test Project") {
  const res = await fetch(`${baseUrl}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return (await res.json()) as Record<string, unknown>;
}

async function createAgent(baseUrl: string, name = "Test Agent") {
  const res = await fetch(`${baseUrl}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return (await res.json()) as Record<string, unknown>;
}

async function createUser(
  baseUrl: string,
  overrides: { name?: string; email?: string } = {},
) {
  const res = await fetch(`${baseUrl}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `u-${Date.now()}-${Math.random()}@example.com`,
    }),
  });
  return (await res.json()) as Record<string, unknown>;
}

async function createTask(
  baseUrl: string,
  projectIri: string,
  title = "Test Task",
) {
  const res = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, project: projectIri }),
  });
  return (await res.json()) as Record<string, unknown>;
}

describe("Task lifecycle (E2E)", () => {
  it("should create a task linked to a project", async () => {
    const project = await createProject(server.baseUrl);
    const response = await fetch(`${server.baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "My Task",
        project: project["@id"],
      }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body["@id"]).toBeDefined();
    expect(body["title"]).toBe("My Task");
    expect(body["project"]).toBe(project["@id"]);
    expect(body["status"]).toBe("backlog");
  });

  it("should perform full lifecycle: create → assign → set ready → filter", async () => {
    const project = await createProject(server.baseUrl);
    const agent = await createAgent(server.baseUrl);
    const task = await createTask(
      server.baseUrl,
      project["@id"] as string,
      "Lifecycle Task",
    );
    const taskUuid = task["uuid"] as string;

    // Assign agent to task
    const assignRes = await fetch(
      `${server.baseUrl}/tasks/${taskUuid}/assign`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee: agent["@id"] }),
      },
    );
    expect(assignRes.status).toBe(200);
    const assigned = (await assignRes.json()) as Record<string, unknown>;
    expect(assigned["assignee"]).toBe(agent["@id"]);

    // Update status to ready
    const statusRes = await fetch(
      `${server.baseUrl}/tasks/${taskUuid}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      },
    );
    expect(statusRes.status).toBe(200);
    const readyTask = (await statusRes.json()) as Record<string, unknown>;
    expect(readyTask["status"]).toBe("ready");

    // Filter by status
    const filterRes = await fetch(
      `${server.baseUrl}/tasks?status=ready`,
    );
    expect(filterRes.status).toBe(200);
    const filtered = (await filterRes.json()) as Record<string, unknown>;
    expect(filtered["totalItems"]).toBe(1);

    // Filter by assignee IRI
    const assigneeFilterRes = await fetch(
      `${server.baseUrl}/tasks?assignee=${encodeURIComponent(agent["@id"] as string)}`,
    );
    expect(assigneeFilterRes.status).toBe(200);
    const assigneeFiltered = (await assigneeFilterRes.json()) as Record<
      string,
      unknown
    >;
    expect(assigneeFiltered["totalItems"]).toBe(1);
  });

  it("should assign a user to a task", async () => {
    const project = await createProject(server.baseUrl);
    const user = await createUser(server.baseUrl, {
      name: "Alice",
      email: "alice-lifecycle@example.com",
    });
    const task = await createTask(
      server.baseUrl,
      project["@id"] as string,
      "User Task",
    );
    const taskUuid = task["uuid"] as string;

    const assignRes = await fetch(
      `${server.baseUrl}/tasks/${taskUuid}/assign`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee: user["@id"] }),
      },
    );
    expect(assignRes.status).toBe(200);
    const assigned = (await assignRes.json()) as Record<string, unknown>;
    expect(assigned["assignee"]).toBe(user["@id"]);

    // Filter by user assignee
    const filterRes = await fetch(
      `${server.baseUrl}/tasks?assignee=${encodeURIComponent(user["@id"] as string)}`,
    );
    const filtered = (await filterRes.json()) as Record<string, unknown>;
    expect(filtered["totalItems"]).toBe(1);
  });

  it("should return 400 when assignee IRI is not agent or user", async () => {
    const project = await createProject(server.baseUrl);
    const task = await createTask(
      server.baseUrl,
      project["@id"] as string,
    );
    const response = await fetch(
      `${server.baseUrl}/tasks/${task["uuid"]}/assign`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee: project["@id"] }),
      },
    );
    expect(response.status).toBe(400);
  });

  it("should list tasks by project", async () => {
    const project = await createProject(server.baseUrl);
    await createTask(server.baseUrl, project["@id"] as string, "Task A");
    await createTask(server.baseUrl, project["@id"] as string, "Task B");

    const response = await fetch(
      `${server.baseUrl}/projects/${project["uuid"]}/tasks`,
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body["totalItems"]).toBe(2);
    expect(body["member"]).toHaveLength(2);
  });

  it("should return 404 for non-existent task", async () => {
    const response = await fetch(
      `${server.baseUrl}/tasks/00000000-0000-0000-0000-000000000000`,
    );
    expect(response.status).toBe(404);
  });

  it("should return 400 when creating task without title", async () => {
    const project = await createProject(server.baseUrl);
    const response = await fetch(`${server.baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: project["@id"] }),
    });
    expect(response.status).toBe(400);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body["violations"]).toBeDefined();
  });

  it("should return 400 when creating task without project", async () => {
    const response = await fetch(`${server.baseUrl}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "No Project" }),
    });
    expect(response.status).toBe(400);
  });

  it("should paginate tasks with Hydra view links", async () => {
    const project = await createProject(server.baseUrl);
    for (let i = 0; i < 5; i++) {
      await createTask(
        server.baseUrl,
        project["@id"] as string,
        `Task ${i}`,
      );
    }

    const response = await fetch(
      `${server.baseUrl}/tasks?itemsPerPage=2`,
    );
    const body = (await response.json()) as Record<string, unknown>;

    expect(body["totalItems"]).toBe(5);
    expect((body["member"] as unknown[]).length).toBe(2);
    expect(body["view"]).toBeDefined();
  });
});
