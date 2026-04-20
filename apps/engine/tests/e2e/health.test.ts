import { describe, it, expect, afterAll } from "vitest";

import { startTestServer, type TestServer } from "../helpers/create-app.js";
import {
  getTestDatabaseUrl,
  createTestDatabase,
  closeTestDatabase,
} from "../helpers/test-database.js";

const testDbUrl = getTestDatabaseUrl();
const { client } = await createTestDatabase();
let server: TestServer;

server = await startTestServer(testDbUrl);

afterAll(async () => {
  await server.close();
  await closeTestDatabase(client);
});

describe("GET /health", () => {
  it("should return 200 with status ok", async () => {
    const response = await fetch(`${server.baseUrl}/health`);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });
});

describe("GET /openapi.json", () => {
  it("should return the OpenAPI spec", async () => {
    const response = await fetch(`${server.baseUrl}/openapi.json`);

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body["openapi"]).toBeDefined();
  });
});
