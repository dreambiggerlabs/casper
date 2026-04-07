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

describe("Project lifecycle (E2E)", () => {
  it("should create a project and return 201 with @id", async () => {
    const response = await fetch(`${server.baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "My Project", description: "A test" }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body["@id"]).toBeDefined();
    expect(body["title"]).toBe("My Project");
    expect(body["description"]).toBe("A test");
    expect(body["uuid"]).toBeDefined();
  });

  it("should list projects in Hydra Collection format", async () => {
    // Create two projects
    await fetch(`${server.baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Project 1" }),
    });
    await fetch(`${server.baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Project 2" }),
    });

    const response = await fetch(`${server.baseUrl}/projects`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body["@type"]).toBe("Collection");
    expect(body["totalItems"]).toBe(2);
    expect(body["member"]).toHaveLength(2);
  });

  it("should get a single project by uuid", async () => {
    const createRes = await fetch(`${server.baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Find Me" }),
    });
    const created = (await createRes.json()) as Record<string, unknown>;

    const response = await fetch(
      `${server.baseUrl}/projects/${created["uuid"]}`,
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body["uuid"]).toBe(created["uuid"]);
    expect(body["title"]).toBe("Find Me");
  });

  it("should update a project", async () => {
    const createRes = await fetch(`${server.baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Original" }),
    });
    const created = (await createRes.json()) as Record<string, unknown>;

    const response = await fetch(
      `${server.baseUrl}/projects/${created["uuid"]}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      },
    );
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body["title"]).toBe("Updated");
  });

  it("should return 404 for non-existent project", async () => {
    const response = await fetch(
      `${server.baseUrl}/projects/00000000-0000-0000-0000-000000000000`,
    );
    expect(response.status).toBe(404);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body["error"]).toBeDefined();
  });

  it("should return 400 with violations when title is missing", async () => {
    const response = await fetch(`${server.baseUrl}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body["error"]).toBe("Validation failed");
    expect(body["violations"]).toBeDefined();
  });
});
