import { describe, it, expect, vi } from "vitest";

import { NotFoundError } from "../../../src/shared/domain/error/not-found.error.js";
import { ValidationError } from "../../../src/shared/domain/error/validation.error.js";

import { UserService } from "../../../src/user/application/service/user.service.js";
import type { UserRepository } from "../../../src/user/application/port/user.repository.js";
import type { User } from "../../../src/user/domain/entity/user.entity.js";

function createMockUserRepository(): UserRepository {
  return {
    findByUuid: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    findPaginated: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  const uuid = overrides.uuid ?? "550e8400-e29b-41d4-a716-446655440020";
  return {
    "@id": `/users/${uuid}`,
    uuid,
    name: "Test User",
    email: "test@example.com",
    createdAt: new Date("2026-01-01"),
    updatedAt: null,
    ...overrides,
  };
}

describe("UserService", () => {
  describe("createUser", () => {
    it("should create a user when valid data is provided", async () => {
      const userRepository = createMockUserRepository();
      const expected = makeUser({ name: "Alice", email: "alice@example.com" });

      vi.mocked(userRepository.create).mockResolvedValue(expected);

      const service = new UserService(userRepository);
      const result = await service.createUser({
        name: "Alice",
        email: "alice@example.com",
      });

      expect(result).toEqual(expected);
      expect(userRepository.create).toHaveBeenCalledWith({
        name: "Alice",
        email: "alice@example.com",
      });
    });

    it("should throw ValidationError when name is missing", async () => {
      const service = new UserService(createMockUserRepository());

      await expect(
        service.createUser({ email: "alice@example.com" }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when email is missing", async () => {
      const service = new UserService(createMockUserRepository());

      await expect(service.createUser({ name: "Alice" })).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw ValidationError when email is malformed", async () => {
      const service = new UserService(createMockUserRepository());

      await expect(
        service.createUser({ name: "Alice", email: "not-an-email" }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getUser", () => {
    it("should return a user when it exists", async () => {
      const userRepository = createMockUserRepository();
      const expected = makeUser();
      vi.mocked(userRepository.findByUuid).mockResolvedValue(expected);

      const service = new UserService(userRepository);
      const result = await service.getUser(expected.uuid);

      expect(result).toEqual(expected);
    });

    it("should throw NotFoundError when user does not exist", async () => {
      const userRepository = createMockUserRepository();
      vi.mocked(userRepository.findByUuid).mockResolvedValue(undefined);

      const service = new UserService(userRepository);

      await expect(service.getUser("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("listUsers", () => {
    it("should return paginated users", async () => {
      const userRepository = createMockUserRepository();
      const users = [makeUser(), makeUser({ uuid: "other-uuid" })];
      vi.mocked(userRepository.findPaginated).mockResolvedValue(users);
      vi.mocked(userRepository.count).mockResolvedValue(2);

      const service = new UserService(userRepository);
      const result = await service.listUsers({ page: 1, itemsPerPage: 30 });

      expect(result).toEqual({ items: users, totalItems: 2 });
      expect(userRepository.findPaginated).toHaveBeenCalledWith({
        limit: 30,
        offset: 0,
      });
    });
  });

  describe("updateUser", () => {
    it("should update a user when valid data is provided", async () => {
      const userRepository = createMockUserRepository();
      const expected = makeUser({ name: "Updated" });
      vi.mocked(userRepository.update).mockResolvedValue(expected);

      const service = new UserService(userRepository);
      const result = await service.updateUser(expected.uuid, {
        name: "Updated",
      });

      expect(result).toEqual(expected);
    });

    it("should throw NotFoundError when updating a non-existent user", async () => {
      const userRepository = createMockUserRepository();
      vi.mocked(userRepository.update).mockResolvedValue(undefined);

      const service = new UserService(userRepository);

      await expect(
        service.updateUser("nonexistent", { name: "Updated" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when no fields are provided", async () => {
      const service = new UserService(createMockUserRepository());

      await expect(service.updateUser("some-uuid", {})).rejects.toThrow(
        ValidationError,
      );
    });
  });
});
