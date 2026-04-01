import { describe, it, expect, vi } from "vitest";

import { NotFoundError, ValidationError } from "../../../src/shared/errors/index.js";

import { ProjectService } from "../../../src/projects/projects.service.js";
import type { ProjectRepository, Project } from "../../../src/projects/projects.types.js";

function createMockRepository(): ProjectRepository {
  return {
    findByUuid: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    uuid: "550e8400-e29b-41d4-a716-446655440000",
    title: "Test Project",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("ProjectService", () => {
  describe("createProject", () => {
    it("should create a project when valid data is provided", async () => {
      const repo = createMockRepository();
      const expected = makeProject({ title: "My Project" });
      vi.mocked(repo.create).mockResolvedValue(expected);

      const service = new ProjectService(repo);
      const result = await service.createProject({ title: "My Project" });

      expect(result).toEqual(expected);
      expect(repo.create).toHaveBeenCalledWith({ title: "My Project" });
    });

    it("should throw ValidationError when title is missing", async () => {
      const service = new ProjectService(createMockRepository());

      await expect(service.createProject({})).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when title is empty string", async () => {
      const service = new ProjectService(createMockRepository());

      await expect(service.createProject({ title: "" })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("getProject", () => {
    it("should return a project when it exists", async () => {
      const repo = createMockRepository();
      const expected = makeProject();
      vi.mocked(repo.findByUuid).mockResolvedValue(expected);

      const service = new ProjectService(repo);
      const result = await service.getProject(expected.uuid);

      expect(result).toEqual(expected);
    });

    it("should throw NotFoundError when project does not exist", async () => {
      const repo = createMockRepository();
      vi.mocked(repo.findByUuid).mockResolvedValue(undefined);

      const service = new ProjectService(repo);

      await expect(service.getProject("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("listProjects", () => {
    it("should return all projects", async () => {
      const repo = createMockRepository();
      const expected = [makeProject(), makeProject({ uuid: "other-uuid" })];
      vi.mocked(repo.findAll).mockResolvedValue(expected);

      const service = new ProjectService(repo);
      const result = await service.listProjects();

      expect(result).toEqual(expected);
    });

    it("should return empty array when no projects exist", async () => {
      const repo = createMockRepository();
      vi.mocked(repo.findAll).mockResolvedValue([]);

      const service = new ProjectService(repo);
      const result = await service.listProjects();

      expect(result).toEqual([]);
    });
  });

  describe("updateProject", () => {
    it("should update a project when valid data is provided", async () => {
      const repo = createMockRepository();
      const expected = makeProject({ title: "Updated" });
      vi.mocked(repo.update).mockResolvedValue(expected);

      const service = new ProjectService(repo);
      const result = await service.updateProject(expected.uuid, {
        title: "Updated",
      });

      expect(result).toEqual(expected);
    });

    it("should throw NotFoundError when updating a non-existent project", async () => {
      const repo = createMockRepository();
      vi.mocked(repo.update).mockResolvedValue(undefined);

      const service = new ProjectService(repo);

      await expect(
        service.updateProject("nonexistent", { title: "Updated" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when no fields are provided", async () => {
      const service = new ProjectService(createMockRepository());

      await expect(service.updateProject("some-uuid", {})).rejects.toThrow(
        ValidationError,
      );
    });
  });
});