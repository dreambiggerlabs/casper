import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { startTestServer, type TestServer } from "../../helpers/create-app.js";
import {
  closeTestDatabase,
  createTestDatabase,
  truncateAllTables,
} from "../../helpers/test-database.js";
import {
  createTestWorker,
  resetFixtureCounter,
} from "../../helpers/fixtures.js";

const { db, client } = await createTestDatabase();
const server: TestServer = await startTestServer(db);

afterAll(async () => {
  await server.close();
  await closeTestDatabase(client);
});

beforeEach(async () => {
  await truncateAllTables(db);
  resetFixtureCounter();
});

async function createProject(payload: Record<string, unknown>) {
  const res = await fetch(`${server.baseUrl}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { res, body: (await res.json()) as Record<string, unknown> };
}

describe("Project credential (E2E)", () => {
  it("returns credentialType in the project response but never the secret", async () => {
    const { res, body } = await createProject({
      title: "Auth project",
      repositoryUrl: "https://github.com/org/repo.git",
      credential: { type: "https_token", token: "ghp_topsecret_xyz" },
    });

    expect(res.status).toBe(201);
    expect(body["credentialType"]).toBe("https_token");
    expect(JSON.stringify(body)).not.toContain("ghp_topsecret_xyz");

    const fetchRes = await fetch(`${server.baseUrl}/projects/${body["uuid"]}`);
    const fetched = (await fetchRes.json()) as Record<string, unknown>;
    expect(fetched["credentialType"]).toBe("https_token");
    expect(JSON.stringify(fetched)).not.toContain("ghp_topsecret_xyz");
  });

  it("rejects credential reads without a worker bearer token", async () => {
    const { body } = await createProject({
      title: "Needs auth",
      credential: { type: "https_token", token: "ghp_x" },
    });

    const res = await fetch(
      `${server.baseUrl}/projects/${body["uuid"]}/credential`,
    );
    expect(res.status).toBe(401);
  });

  it("rejects credential reads with a bogus bearer token", async () => {
    const { body } = await createProject({
      title: "Bad token",
      credential: { type: "https_token", token: "ghp_x" },
    });

    const res = await fetch(
      `${server.baseUrl}/projects/${body["uuid"]}/credential`,
      { headers: { Authorization: "Bearer not-a-real-token" } },
    );
    expect(res.status).toBe(401);
  });

  it("returns the decrypted credential to a worker with a valid token", async () => {
    const worker = await createTestWorker(db);
    const { body: project } = await createProject({
      title: "With cred",
      credential: {
        type: "https_token",
        username: "octocat",
        token: "ghp_decryptme",
      },
    });

    const res = await fetch(
      `${server.baseUrl}/projects/${project["uuid"]}/credential`,
      { headers: { Authorization: `Bearer ${worker.token}` } },
    );
    expect(res.status).toBe(200);
    const cred = (await res.json()) as Record<string, unknown>;
    expect(cred).toEqual({
      type: "https_token",
      username: "octocat",
      token: "ghp_decryptme",
    });
  });

  it("returns 404 when project has no credential", async () => {
    const worker = await createTestWorker(db);
    const { body: project } = await createProject({ title: "No cred" });

    const res = await fetch(
      `${server.baseUrl}/projects/${project["uuid"]}/credential`,
      { headers: { Authorization: `Bearer ${worker.token}` } },
    );
    expect(res.status).toBe(404);
  });

  it("clears credential when PATCH sets credential to null", async () => {
    const worker = await createTestWorker(db);
    const { body: project } = await createProject({
      title: "Clear me",
      credential: { type: "https_token", token: "ghp_clear" },
    });

    const patchRes = await fetch(
      `${server.baseUrl}/projects/${project["uuid"]}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: null }),
      },
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as Record<string, unknown>;
    expect(patched["credentialType"]).toBeNull();

    const credRes = await fetch(
      `${server.baseUrl}/projects/${project["uuid"]}/credential`,
      { headers: { Authorization: `Bearer ${worker.token}` } },
    );
    expect(credRes.status).toBe(404);
  });
});
