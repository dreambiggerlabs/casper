import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";

import { DrizzleProjectRepository } from "../../../src/project/project.repository.js";
import {
  createTestDatabase,
  truncateAllTables,
  closeTestDatabase,
} from "../../helpers/test-database.js";
import { resetFixtureCounter } from "../../helpers/fixtures.js";

const { db, client } = await createTestDatabase();
const repo = new DrizzleProjectRepository(db);

afterAll(async () => {
  await closeTestDatabase(client);
});

beforeEach(async () => {
  await truncateAllTables(db);
  resetFixtureCounter();
});

describe("DrizzleProjectRepository", () => {
  describe("create", () => {
    it("should insert a project and return it with uuid and timestamps", async () => {
      const project = await repo.create({ title: "My Project" });

      expect(project.uuid).toBeDefined();
      expect(project["@id"]).toBe(`/projects/${project.uuid}`);
      expect(project.title).toBe("My Project");
      expect(project.description).toBeNull();
      expect(project.createdAt).toBeInstanceOf(Date);
    });

    it("should create a project with description", async () => {
      const project = await repo.create({
        title: "With Desc",
        description: "A description",
      });

      expect(project.description).toBe("A description");
    });

    it("should create a project with repositoryUrl", async () => {
      const project = await repo.create({
        title: "Remote",
        repositoryUrl: "https://github.com/org/repo.git",
      });

      expect(project.repositoryUrl).toBe("https://github.com/org/repo.git");
    });

    it("should create a project without repositoryUrl", async () => {
      const project = await repo.create({ title: "Local" });

      expect(project.repositoryUrl).toBeNull();
    });
  });

  describe("findByUuid", () => {
    it("should return the project when it exists", async () => {
      const created = await repo.create({ title: "Find Me" });
      const found = await repo.findByUuid(created.uuid);

      expect(found).toBeDefined();
      expect(found!.uuid).toBe(created.uuid);
      expect(found!.title).toBe("Find Me");
    });

    it("should return undefined for non-existent uuid", async () => {
      const found = await repo.findByUuid(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeUndefined();
    });
  });

  describe("findAll", () => {
    it("should return all projects", async () => {
      await repo.create({ title: "Project 1" });
      await repo.create({ title: "Project 2" });
      await repo.create({ title: "Project 3" });

      const all = await repo.findAll();
      expect(all).toHaveLength(3);
    });
  });

  describe("count", () => {
    it("should return the total number of projects", async () => {
      await repo.create({ title: "A" });
      await repo.create({ title: "B" });

      const count = await repo.count();
      expect(count).toBe(2);
    });

    it("should return 0 when no projects exist", async () => {
      const count = await repo.count();
      expect(count).toBe(0);
    });
  });

  describe("findPaginated", () => {
    it("should return paginated results", async () => {
      for (let i = 0; i < 5; i++) {
        await repo.create({ title: `Project ${i}` });
      }

      const page1 = await repo.findPaginated({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await repo.findPaginated({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);

      const page3 = await repo.findPaginated({ limit: 2, offset: 4 });
      expect(page3).toHaveLength(1);
    });
  });

  describe("update", () => {
    it("should update a project and set updatedAt", async () => {
      const created = await repo.create({ title: "Original" });
      const updated = await repo.update(created.uuid, { title: "Updated" });

      expect(updated).toBeDefined();
      expect(updated!.title).toBe("Updated");
      expect(updated!.updatedAt).toBeInstanceOf(Date);
    });

    it("should return undefined when updating non-existent project", async () => {
      const result = await repo.update(
        "00000000-0000-0000-0000-000000000000",
        { title: "Nope" },
      );
      expect(result).toBeUndefined();
    });

    it("should update repositoryUrl on an existing project", async () => {
      const created = await repo.create({ title: "Local" });
      expect(created.repositoryUrl).toBeNull();

      const updated = await repo.update(created.uuid, {
        repositoryUrl: "https://github.com/org/repo.git",
      });

      expect(updated).toBeDefined();
      expect(updated!.repositoryUrl).toBe("https://github.com/org/repo.git");
    });
  });

  describe("credentials", () => {
    it("stores https_token credential encrypted at rest and returns credentialType", async () => {
      const created = await repo.create({
        title: "Token project",
        credential: { type: "https_token", token: "ghp_supersecret_xyz" },
      });

      expect(created.credentialType).toBe("https_token");

      const rawRows = await db.execute(
        sql`SELECT credential_type, credential FROM project WHERE uuid = ${created.uuid}::uuid`,
      );
      const raw = rawRows[0] as {
        credential_type: string | null;
        credential: string | null;
      };
      expect(raw.credential_type).toBe("https_token");
      expect(raw.credential).toBeTruthy();
      expect(raw.credential).not.toContain("ghp_supersecret_xyz");
    });

    it("decrypts credential via findCredential", async () => {
      const created = await repo.create({
        title: "Decrypt project",
        credential: {
          type: "ssh_key",
          privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\ndata\n",
          passphrase: "p4ss",
        },
      });

      const credential = await repo.findCredential(created.uuid);
      expect(credential).toEqual({
        type: "ssh_key",
        privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\ndata\n",
        passphrase: "p4ss",
      });
    });

    it("returns null when no credential is set", async () => {
      const created = await repo.create({ title: "No cred" });
      const credential = await repo.findCredential(created.uuid);
      expect(credential).toBeNull();
    });

    it("clears credential when update sets credential to null", async () => {
      const created = await repo.create({
        title: "To clear",
        credential: { type: "https_token", token: "to_be_cleared" },
      });
      expect(created.credentialType).toBe("https_token");

      const updated = await repo.update(created.uuid, { credential: null });
      expect(updated!.credentialType).toBeNull();
      expect(await repo.findCredential(created.uuid)).toBeNull();
    });

    it("leaves credential untouched when update does not include credential", async () => {
      const created = await repo.create({
        title: "Keep cred",
        credential: { type: "https_token", token: "stays" },
      });

      await repo.update(created.uuid, { title: "Renamed" });

      const credential = await repo.findCredential(created.uuid);
      expect(credential).toEqual({ type: "https_token", token: "stays" });
    });
  });
});
