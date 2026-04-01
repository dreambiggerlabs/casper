import { describe, it, expect, vi } from "vitest";

import { NotFoundError, ValidationError } from "../../../src/shared/errors/index.js";

import type { ProjectReader } from "../../../src/projects/projects.types.js";

import { TaskService } from "../../../src/tasks/tasks.service.js";
import type { TaskRepository, Task } from "../../../src/tasks/tasks.types.js";

function createMockTaskRepository(): TaskRepository {
  return {
    findByUuid: vi.fn(),
    findByProjectId: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
}

function createMockProjectReader(): ProjectReader {
  return {
    findByUuid: vi.fn(),
    findAll: vi.fn(),
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    uuid: "550e8400-e29b-41d4-a716-446655440001",
    title: "Test Task",
    projectId: "550e8400-e29b-41d4-a716-446655440000",
    parentId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("TaskService", () => {
  describe("createTask", () => {
    it("should create a task when valid data is provided and project exists", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();
      const expectedTask = makeTask({ title: "My Task" });

      vi.mocked(projectReader.findByUuid).mockResolvedValue({
        uuid: expectedTask.projectId,
        title: "Test Project",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(taskRepository.create).mockResolvedValue(expectedTask);

      const service = new TaskService(taskRepository, projectReader);
      const result = await service.createTask({
        title: "My Task",
        projectId: expectedTask.projectId,
      });

      expect(result).toEqual(expectedTask);
      expect(taskRepository.create).toHaveBeenCalledWith({
        title: "My Task",
        projectId: expectedTask.projectId,
      });
    });

    it("should throw NotFoundError when creating a task for non-existent project", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();

      vi.mocked(projectReader.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(taskRepository, projectReader);

      await expect(
        service.createTask({
          title: "My Task",
          projectId: "550e8400-e29b-41d4-a716-446655440999",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when parent task does not exist", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();

      vi.mocked(projectReader.findByUuid).mockResolvedValue({
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        title: "Test Project",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(taskRepository, projectReader);

      await expect(
        service.createTask({
          title: "My Task",
          projectId: "550e8400-e29b-41d4-a716-446655440000",
          parentId: "550e8400-e29b-41d4-a716-446655440998",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when title is missing", async () => {
      const service = new TaskService(
        createMockTaskRepository(),
        createMockProjectReader(),
      );

      await expect(
        service.createTask({ projectId: "some-uuid" }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when projectId is missing", async () => {
      const service = new TaskService(
        createMockTaskRepository(),
        createMockProjectReader(),
      );

      await expect(service.createTask({ title: "My Task" })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("getTask", () => {
    it("should return a task when it exists", async () => {
      const taskRepository = createMockTaskRepository();
      const expected = makeTask();
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(expected);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
      );
      const result = await service.getTask(expected.uuid);

      expect(result).toEqual(expected);
    });

    it("should throw NotFoundError when task does not exist", async () => {
      const taskRepository = createMockTaskRepository();
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
      );

      await expect(service.getTask("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("listTasks", () => {
    it("should return all tasks", async () => {
      const taskRepository = createMockTaskRepository();
      const expected = [makeTask(), makeTask({ uuid: "other-uuid" })];
      vi.mocked(taskRepository.findAll).mockResolvedValue(expected);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
      );
      const result = await service.listTasks();

      expect(result).toEqual(expected);
    });
  });

  describe("listTasksByProject", () => {
    it("should return tasks for a given project when project exists", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();
      const projectId = "project-uuid";
      const expected = [makeTask({ projectId }), makeTask({ projectId })];

      vi.mocked(projectReader.findByUuid).mockResolvedValue({
        uuid: projectId,
        title: "Test Project",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(taskRepository.findByProjectId).mockResolvedValue(expected);

      const service = new TaskService(taskRepository, projectReader);
      const result = await service.listTasksByProject(projectId);

      expect(result).toEqual(expected);
    });

    it("should throw NotFoundError when project does not exist", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();

      vi.mocked(projectReader.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(taskRepository, projectReader);

      await expect(service.listTasksByProject("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("updateTask", () => {
    it("should update a task when valid data is provided", async () => {
      const taskRepository = createMockTaskRepository();
      const expected = makeTask({ title: "Updated" });
      vi.mocked(taskRepository.update).mockResolvedValue(expected);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
      );
      const result = await service.updateTask(expected.uuid, {
        title: "Updated",
      });

      expect(result).toEqual(expected);
    });

    it("should throw NotFoundError when updating a non-existent task", async () => {
      const taskRepository = createMockTaskRepository();
      vi.mocked(taskRepository.update).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
      );

      await expect(
        service.updateTask("nonexistent", { title: "Updated" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when no fields are provided", async () => {
      const service = new TaskService(
        createMockTaskRepository(),
        createMockProjectReader(),
      );

      await expect(service.updateTask("some-uuid", {})).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw NotFoundError when changing to non-existent project", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();

      vi.mocked(projectReader.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(taskRepository, projectReader);

      await expect(
        service.updateTask("550e8400-e29b-41d4-a716-446655440001", {
          projectId: "550e8400-e29b-41d4-a716-446655440999",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when changing to non-existent parent", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(taskRepository, projectReader);

      await expect(
        service.updateTask("550e8400-e29b-41d4-a716-446655440001", {
          parentId: "550e8400-e29b-41d4-a716-446655440998",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});