import { describe, it, expect, vi } from "vitest";

import { NotFoundError } from "../../../src/shared/domain/error/not-found.error.js";
import { ValidationError } from "../../../src/shared/domain/error/validation.error.js";

import { ProjectService } from "../../../src/project/application/service/project.service.js";
import type { ProjectRepository } from "../../../src/project/application/port/project.repository.js";
import type { Project } from "../../../src/project/domain/entity/project.entity.js";

function createMockRepository(): ProjectRepository {
  return {
    findByUuid: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    findPaginated: vi.fn(),
    findCredential: vi.fn(),
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
    credentialType: null,
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

    it("should accept an https_token credential", async () => {
      const repo = createMockRepository();
      const expected = makeProject({
        title: "Auth project",
        repositoryUrl: "https://github.com/org/repo.git",
        credentialType: "https_token",
      });
      vi.mocked(repo.create).mockResolvedValue(expected);

      const service = new ProjectService(repo);
      const result = await service.createProject({
        title: "Auth project",
        repositoryUrl: "https://github.com/org/repo.git",
        credential: { type: "https_token", token: "ghp_x" },
      });

      expect(result.credentialType).toBe("https_token");
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          credential: { type: "https_token", token: "ghp_x" },
        }),
      );
    });

    it("should accept an ssh_key credential", async () => {
      const repo = createMockRepository();
      const expected = makeProject({
        title: "SSH project",
        repositoryUrl: "git@github.com:org/repo.git",
        credentialType: "ssh_key",
      });
      vi.mocked(repo.create).mockResolvedValue(expected);

      const service = new ProjectService(repo);
      const result = await service.createProject({
        title: "SSH project",
        credential: { type: "ssh_key", privateKey: "-----BEGIN..." },
      });

      expect(result.credentialType).toBe("ssh_key");
    });

    it("should reject an https_token credential missing token", async () => {
      const service = new ProjectService(createMockRepository());

      await expect(
        service.createProject({
          title: "Bad cred",
          credential: { type: "https_token" } as unknown,
        }),
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

    it("should clear credentials when credential is null", async () => {
      const repo = createMockRepository();
      const expected = makeProject({ credentialType: null });
      vi.mocked(repo.update).mockResolvedValue(expected);

      const service = new ProjectService(repo);
      await service.updateProject(expected.uuid, { credential: null });

      expect(repo.update).toHaveBeenCalledWith(
        expected.uuid,
        expect.objectContaining({ credential: null }),
      );
    });
  });

  describe("getCredential", () => {
    it("should return the decrypted credential", async () => {
      const repo = createMockRepository();
      const project = makeProject({ credentialType: "https_token" });
      vi.mocked(repo.findByUuid).mockResolvedValue(project);
      vi.mocked(repo.findCredential).mockResolvedValue({
        type: "https_token",
        token: "ghp_secret",
      });

      const service = new ProjectService(repo);
      const result = await service.getCredential(project.uuid);

      expect(result).toEqual({ type: "https_token", token: "ghp_secret" });
    });

    it("should throw NotFoundError when project does not exist", async () => {
      const repo = createMockRepository();
      vi.mocked(repo.findByUuid).mockResolvedValue(undefined);

      const service = new ProjectService(repo);

      await expect(service.getCredential("missing")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should throw NotFoundError when no credential is set", async () => {
      const repo = createMockRepository();
      const project = makeProject({ credentialType: null });
      vi.mocked(repo.findByUuid).mockResolvedValue(project);
      vi.mocked(repo.findCredential).mockResolvedValue(null);

      const service = new ProjectService(repo);

      await expect(service.getCredential(project.uuid)).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});
