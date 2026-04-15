import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { DrizzleUserRepository } from "../../../src/user/user.repository.js";
import {
  createTestDatabase,
  truncateAllTables,
  closeTestDatabase,
} from "../../helpers/test-database.js";
import { resetFixtureCounter } from "../../helpers/fixtures.js";

const { db, client } = await createTestDatabase();
const repo = new DrizzleUserRepository(db);

afterAll(async () => {
  await closeTestDatabase(client);
});

beforeEach(async () => {
  await truncateAllTables(db);
  resetFixtureCounter();
});

describe("DrizzleUserRepository", () => {
  describe("create", () => {
    it("should insert a user and return it with uuid", async () => {
      const user = await repo.create({
        name: "Alice",
        email: "alice@example.com",
      });

      expect(user.uuid).toBeDefined();
      expect(user["@id"]).toBe(`/users/${user.uuid}`);
      expect(user.name).toBe("Alice");
      expect(user.email).toBe("alice@example.com");
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeNull();
    });

    it("should throw on duplicate email", async () => {
      await repo.create({ name: "A", email: "dup@example.com" });

      await expect(
        repo.create({ name: "B", email: "dup@example.com" }),
      ).rejects.toThrow();
    });
  });

  describe("findByUuid", () => {
    it("should return the user when it exists", async () => {
      const created = await repo.create({
        name: "Find Me",
        email: "find@example.com",
      });
      const found = await repo.findByUuid(created.uuid);

      expect(found).toBeDefined();
      expect(found!.uuid).toBe(created.uuid);
      expect(found!.email).toBe("find@example.com");
    });

    it("should return undefined for non-existent uuid", async () => {
      const found = await repo.findByUuid(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeUndefined();
    });
  });

  describe("findAll", () => {
    it("should return all users", async () => {
      await repo.create({ name: "U1", email: "u1@example.com" });
      await repo.create({ name: "U2", email: "u2@example.com" });

      const all = await repo.findAll();
      expect(all).toHaveLength(2);
    });
  });

  describe("count", () => {
    it("should return the total number of users", async () => {
      await repo.create({ name: "A", email: "a@example.com" });
      await repo.create({ name: "B", email: "b@example.com" });
      await repo.create({ name: "C", email: "c@example.com" });

      const count = await repo.count();
      expect(count).toBe(3);
    });
  });

  describe("findPaginated", () => {
    it("should return paginated results", async () => {
      for (let i = 0; i < 4; i++) {
        await repo.create({ name: `User ${i}`, email: `u${i}@example.com` });
      }

      const page1 = await repo.findPaginated({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await repo.findPaginated({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);

      const page3 = await repo.findPaginated({ limit: 2, offset: 4 });
      expect(page3).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("should update the user name", async () => {
      const created = await repo.create({
        name: "Original",
        email: "orig@example.com",
      });
      const updated = await repo.update(created.uuid, { name: "Updated" });

      expect(updated!.name).toBe("Updated");
      expect(updated!.updatedAt).toBeInstanceOf(Date);
    });

    it("should return undefined for non-existent uuid", async () => {
      const result = await repo.update(
        "00000000-0000-0000-0000-000000000000",
        { name: "Nope" },
      );
      expect(result).toBeUndefined();
    });
  });
});
