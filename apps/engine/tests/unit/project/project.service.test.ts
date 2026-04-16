import { describe, it, expect, vi } from "vitest";

import { NotFoundError, ValidationError } from "../../../src/shared/errors/index.js";

import { ProjectService } from "../../../src/project/project.service.js";
import type { ProjectRepository, Project } from "../../../src/project/project.types.js";

function createMockRepository(): ProjectRepository {
  return {
    findByUuid: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    findPaginated: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

function makeProject(overrides: Partial<Project> = {}): Project {
  const uuid = overrides.uuid ?? "550e8400-e29b-41d4-a716-446655440000";
  return {
    "@id": `/projects/${uuid}`,
    uuid,
    title: "Test Project",
    description: null,
    repositoryUrl: null,
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

    it("should create a project with repositoryUrl", async () => {
      const repo = createMockRepository();
      const expected = makeProject({
        title: "Remote Project",
        repositoryUrl: "https://github.com/org/repo.git",
      });
      vi.mocked(repo.create).mockResolvedValue(expected);

      const service = new ProjectService(repo);
      const result = await service.createProject({
        title: "Remote Project",
        repositoryUrl: "https://github.com/org/repo.git",
      });

      expect(result).toEqual(expected);
      expect(repo.create).toHaveBeenCalledWith({
        title: "Remote Project",
        repositoryUrl: "https://github.com/org/repo.git",
      });
    });

    it("should create a project without repositoryUrl (local git)", async () => {
      const repo = createMockRepository();
      const expected = makeProject({ title: "Local Project", repositoryUrl: null });
      vi.mocked(repo.create).mockResolvedValue(expected);

      const service = new ProjectService(repo);
      const result = await service.createProject({ title: "Local Project" });

      expect(result).toEqual(expected);
    });

    it("should throw ValidationError when repositoryUrl is not a valid URL", async () => {
      const service = new ProjectService(createMockRepository());

      await expect(
        service.createProject({ title: "Bad URL", repositoryUrl: "not-a-url" }),
      ).rejects.toThrow(ValidationError);
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
    it("should return paginated projects", async () => {
      const repo = createMockRepository();
      const projects = [makeProject(), makeProject({ uuid: "other-uuid" })];
      vi.mocked(repo.findPaginated).mockResolvedValue(projects);
      vi.mocked(repo.count).mockResolvedValue(2);

      const service = new ProjectService(repo);
      const result = await service.listProjects({ page: 1, itemsPerPage: 30 });

      expect(result).toEqual({ items: projects, totalItems: 2 });
      expect(repo.findPaginated).toHaveBeenCalledWith({ limit: 30, offset: 0 });
      expect(repo.count).toHaveBeenCalled();
    });

    it("should return empty result when no projects exist", async () => {
      const repo = createMockRepository();
      vi.mocked(repo.findPaginated).mockResolvedValue([]);
      vi.mocked(repo.count).mockResolvedValue(0);

      const service = new ProjectService(repo);
      const result = await service.listProjects({ page: 1, itemsPerPage: 30 });

      expect(result).toEqual({ items: [], totalItems: 0 });
    });

    it("should compute correct offset for page 2", async () => {
      const repo = createMockRepository();
      vi.mocked(repo.findPaginated).mockResolvedValue([]);
      vi.mocked(repo.count).mockResolvedValue(50);

      const service = new ProjectService(repo);
      await service.listProjects({ page: 2, itemsPerPage: 10 });

      expect(repo.findPaginated).toHaveBeenCalledWith({
        limit: 10,
        offset: 10,
      });
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

    it("should update a project to add repositoryUrl", async () => {
      const repo = createMockRepository();
      const expected = makeProject({
        title: "Upgraded",
        repositoryUrl: "https://github.com/org/repo.git",
      });
      vi.mocked(repo.update).mockResolvedValue(expected);

      const service = new ProjectService(repo);
      const result = await service.updateProject(expected.uuid, {
        repositoryUrl: "https://github.com/org/repo.git",
      });

      expect(result).toEqual(expected);
    });
  });
});
