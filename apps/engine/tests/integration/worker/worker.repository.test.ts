import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { DrizzleWorkerRepository } from "../../../src/worker/infrastructure/repository/drizzle-worker.repository.js";
import {
  createTestDatabase,
  truncateAllTables,
  closeTestDatabase,
} from "../../helpers/test-database.js";
import { resetFixtureCounter } from "../../helpers/fixtures.js";

const { db, client } = await createTestDatabase();
const repo = new DrizzleWorkerRepository(db);

afterAll(async () => {
  await closeTestDatabase(client);
});

beforeEach(async () => {
  await truncateAllTables(db);
  resetFixtureCounter();
});

describe("DrizzleWorkerRepository", () => {
  describe("create", () => {
    it("should insert a worker with name and token", async () => {
      const worker = await repo.create({
        name: "Worker 1",
        token: "abc123def456",
      });

      expect(worker.uuid).toBeDefined();
      expect(worker["@id"]).toBe(`/workers/${worker.uuid}`);
      expect(worker.name).toBe("Worker 1");
      expect(worker.token).toBe("abc123def456");
      expect(worker.status).toBe("active");
      expect(worker.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("findByUuid", () => {
    it("should return the worker when it exists", async () => {
      const created = await repo.create({
        name: "Find Me",
        token: "find-me-token",
      });
      const found = await repo.findByUuid(created.uuid);

      expect(found).toBeDefined();
      expect(found!.uuid).toBe(created.uuid);
    });

    it("should return undefined for non-existent uuid", async () => {
      const found = await repo.findByUuid(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeUndefined();
    });
  });

  describe("findByToken", () => {
    it("should return the worker by token", async () => {
      const created = await repo.create({
        name: "Token Worker",
        token: "unique-token-xyz",
      });
      const found = await repo.findByToken("unique-token-xyz");

      expect(found).toBeDefined();
      expect(found!.uuid).toBe(created.uuid);
    });

    it("should return undefined for non-existent token", async () => {
      const found = await repo.findByToken("nonexistent-token");
      expect(found).toBeUndefined();
    });
  });

  describe("findActive", () => {
    it("should return only active workers", async () => {
      await repo.create({ name: "Active 1", token: "t1" });
      await repo.create({ name: "Active 2", token: "t2" });

      const active = await repo.findActive();
      expect(active).toHaveLength(2);
      expect(active.every((w) => w.status === "active")).toBe(true);
    });
  });

  describe("count", () => {
    it("should return the total number of workers", async () => {
      await repo.create({ name: "W1", token: "t1" });
      await repo.create({ name: "W2", token: "t2" });

      expect(await repo.count()).toBe(2);
    });
  });

  describe("findPaginated", () => {
    it("should return paginated results", async () => {
      for (let i = 0; i < 4; i++) {
        await repo.create({ name: `Worker ${i}`, token: `tok-${i}` });
      }

      const page1 = await repo.findPaginated({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await repo.findPaginated({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);
    });
  });

  describe("updateHeartbeat", () => {
    it("should update lastHeartbeatAt and set status to active", async () => {
      const worker = await repo.create({
        name: "Heartbeat",
        token: "hb-token",
      });

      const updated = await repo.updateHeartbeat(worker.uuid);
      expect(updated).toBeDefined();
      expect(updated!.lastHeartbeatAt).toBeInstanceOf(Date);
      expect(updated!.status).toBe("active");
    });

    it("should return undefined for non-existent worker", async () => {
      const result = await repo.updateHeartbeat(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(result).toBeUndefined();
    });
  });
});
