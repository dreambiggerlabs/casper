import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { DrizzleAgentRepository } from "../../../src/agent/infrastructure/repository/drizzle-agent.repository.js";
import {
  createTestDatabase,
  truncateAllTables,
  closeTestDatabase,
} from "../../helpers/test-database.js";
import { resetFixtureCounter } from "../../helpers/fixtures.js";

const { db, client } = await createTestDatabase();
const repo = new DrizzleAgentRepository(db);

afterAll(async () => {
  await closeTestDatabase(client);
});

beforeEach(async () => {
  await truncateAllTables(db);
  resetFixtureCounter();
});

describe("DrizzleAgentRepository", () => {
  describe("create", () => {
    it("should insert an agent and return it with uuid", async () => {
      const agent = await repo.create({ name: "Claude" });

      expect(agent.uuid).toBeDefined();
      expect(agent["@id"]).toBe(`/agents/${agent.uuid}`);
      expect(agent.name).toBe("Claude");
      expect(agent.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("findByUuid", () => {
    it("should return the agent when it exists", async () => {
      const created = await repo.create({ name: "Find Me" });
      const found = await repo.findByUuid(created.uuid);

      expect(found).toBeDefined();
      expect(found!.uuid).toBe(created.uuid);
      expect(found!.name).toBe("Find Me");
    });

    it("should return undefined for non-existent uuid", async () => {
      const found = await repo.findByUuid(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeUndefined();
    });
  });

  describe("findAll", () => {
    it("should return all agents", async () => {
      await repo.create({ name: "Agent 1" });
      await repo.create({ name: "Agent 2" });

      const all = await repo.findAll();
      expect(all).toHaveLength(2);
    });
  });

  describe("count", () => {
    it("should return the total number of agents", async () => {
      await repo.create({ name: "A" });
      await repo.create({ name: "B" });
      await repo.create({ name: "C" });

      const count = await repo.count();
      expect(count).toBe(3);
    });
  });

  describe("findPaginated", () => {
    it("should return paginated results", async () => {
      for (let i = 0; i < 4; i++) {
        await repo.create({ name: `Agent ${i}` });
      }

      const page1 = await repo.findPaginated({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await repo.findPaginated({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);

      const page3 = await repo.findPaginated({ limit: 2, offset: 4 });
      expect(page3).toHaveLength(0);
    });
  });
});
