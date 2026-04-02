import { describe, it, expect, vi } from "vitest";

import { NotFoundError, ValidationError } from "../../../src/shared/errors/index.js";

import type { ProjectReader } from "../../../src/project/project.types.js";
import type { AgentReader } from "../../../src/agent/agent.types.js";

import { TaskService } from "../../../src/task/task.service.js";
import type { TaskRepository, Task } from "../../../src/task/task.types.js";

function createMockTaskRepository(): TaskRepository {
  return {
    findByUuid: vi.fn(),
    findByProjectId: vi.fn(),
    findByStatusAndAgentId: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    assign: vi.fn(),
    updateStatus: vi.fn(),
  };
}

function createMockProjectReader(): ProjectReader {
  return {
    findByUuid: vi.fn(),
    findAll: vi.fn(),
  };
}

function createMockAgentReader(): AgentReader {
  return {
    findByUuid: vi.fn(),
    findAll: vi.fn(),
  };
}

const AGENT_UUID = "550e8400-e29b-41d4-a716-446655440002";
const PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";
const TASK_UUID = "550e8400-e29b-41d4-a716-446655440001";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    uuid: TASK_UUID,
    title: "Test Task",
    projectId: PROJECT_UUID,
    parentId: null,
    status: "pending",
    agentId: null,
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
      const agentReader = createMockAgentReader();
      const expectedTask = makeTask({ title: "My Task" });

      vi.mocked(projectReader.findByUuid).mockResolvedValue({
        uuid: expectedTask.projectId,
        title: "Test Project",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(taskRepository.create).mockResolvedValue(expectedTask);

      const service = new TaskService(
        taskRepository,
        projectReader,
        agentReader,
      );
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
      const agentReader = createMockAgentReader();

      vi.mocked(projectReader.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        projectReader,
        agentReader,
      );

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
      const agentReader = createMockAgentReader();

      vi.mocked(projectReader.findByUuid).mockResolvedValue({
        uuid: PROJECT_UUID,
        title: "Test Project",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        projectReader,
        agentReader,
      );

      await expect(
        service.createTask({
          title: "My Task",
          projectId: PROJECT_UUID,
          parentId: "550e8400-e29b-41d4-a716-446655440998",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when title is missing", async () => {
      const service = new TaskService(
        createMockTaskRepository(),
        createMockProjectReader(),
        createMockAgentReader(),
      );

      await expect(
        service.createTask({ projectId: "some-uuid" }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when projectId is missing", async () => {
      const service = new TaskService(
        createMockTaskRepository(),
        createMockProjectReader(),
        createMockAgentReader(),
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
        createMockAgentReader(),
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
        createMockAgentReader(),
      );

      await expect(service.getTask("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("listTasks", () => {
    it("should return all tasks when no filters provided", async () => {
      const taskRepository = createMockTaskRepository();
      const expected = [makeTask(), makeTask({ uuid: "other-uuid" })];
      vi.mocked(taskRepository.findAll).mockResolvedValue(expected);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        createMockAgentReader(),
      );
      const result = await service.listTasks();

      expect(result).toEqual(expected);
    });

    it("should return tasks filtered by status and agentId", async () => {
      const taskRepository = createMockTaskRepository();
      const expected = [
        makeTask({ status: "assigned", agentId: AGENT_UUID }),
        makeTask({ status: "assigned", agentId: AGENT_UUID, uuid: "task-2" }),
      ];
      vi.mocked(taskRepository.findByStatusAndAgentId).mockResolvedValue(
        expected,
      );

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        createMockAgentReader(),
      );
      const result = await service.listTasks({
        status: "assigned",
        agentId: AGENT_UUID,
      });

      expect(result).toEqual(expected);
      expect(taskRepository.findByStatusAndAgentId).toHaveBeenCalledWith(
        "assigned",
        AGENT_UUID,
      );
    });

    it("should throw ValidationError when status is invalid", async () => {
      const service = new TaskService(
        createMockTaskRepository(),
        createMockProjectReader(),
        createMockAgentReader(),
      );

      await expect(
        service.listTasks({ status: "invalid", agentId: AGENT_UUID }),
      ).rejects.toThrow(ValidationError);
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

      const service = new TaskService(
        taskRepository,
        projectReader,
        createMockAgentReader(),
      );
      const result = await service.listTasksByProject(projectId);

      expect(result).toEqual(expected);
    });

    it("should throw NotFoundError when project does not exist", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();

      vi.mocked(projectReader.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        projectReader,
        createMockAgentReader(),
      );

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
        createMockAgentReader(),
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
        createMockAgentReader(),
      );

      await expect(
        service.updateTask("nonexistent", { title: "Updated" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when no fields are provided", async () => {
      const service = new TaskService(
        createMockTaskRepository(),
        createMockProjectReader(),
        createMockAgentReader(),
      );

      await expect(service.updateTask("some-uuid", {})).rejects.toThrow(
        ValidationError,
      );
    });

    it("should throw NotFoundError when changing to non-existent project", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();

      vi.mocked(projectReader.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        projectReader,
        createMockAgentReader(),
      );

      await expect(
        service.updateTask(TASK_UUID, {
          projectId: "550e8400-e29b-41d4-a716-446655440999",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when changing to non-existent parent", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        projectReader,
        createMockAgentReader(),
      );

      await expect(
        service.updateTask(TASK_UUID, {
          parentId: "550e8400-e29b-41d4-a716-446655440998",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("assignTask", () => {
    it("should assign an agent to a pending task", async () => {
      const taskRepository = createMockTaskRepository();
      const agentReader = createMockAgentReader();
      const pendingTask = makeTask({ status: "pending" });
      const assignedTask = makeTask({ status: "assigned", agentId: AGENT_UUID });

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(pendingTask);
      vi.mocked(agentReader.findByUuid).mockResolvedValue({
        uuid: AGENT_UUID,
        name: "Test Agent",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(taskRepository.assign).mockResolvedValue(assignedTask);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        agentReader,
      );
      const result = await service.assignTask(pendingTask.uuid, {
        agentId: AGENT_UUID,
      });

      expect(result).toEqual(assignedTask);
      expect(taskRepository.assign).toHaveBeenCalledWith(
        pendingTask.uuid,
        AGENT_UUID,
      );
    });

    it("should throw NotFoundError when task does not exist", async () => {
      const taskRepository = createMockTaskRepository();
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        createMockAgentReader(),
      );

      await expect(
        service.assignTask("nonexistent", { agentId: AGENT_UUID }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when agent does not exist", async () => {
      const taskRepository = createMockTaskRepository();
      const agentReader = createMockAgentReader();
      const pendingTask = makeTask({ status: "pending" });

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(pendingTask);
      vi.mocked(agentReader.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        agentReader,
      );

      await expect(
        service.assignTask(pendingTask.uuid, { agentId: AGENT_UUID }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when task is not in pending status", async () => {
      const taskRepository = createMockTaskRepository();
      const agentReader = createMockAgentReader();
      const alreadyAssignedTask = makeTask({
        status: "assigned",
        agentId: "550e8400-e29b-41d4-a716-446655440003",
      });

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(alreadyAssignedTask);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        agentReader,
      );

      await expect(
        service.assignTask(alreadyAssignedTask.uuid, { agentId: AGENT_UUID }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when agentId is invalid", async () => {
      const service = new TaskService(
        createMockTaskRepository(),
        createMockProjectReader(),
        createMockAgentReader(),
      );

      await expect(
        service.assignTask(TASK_UUID, { agentId: "not-a-uuid" }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("updateTaskStatus", () => {
    it("should update task status", async () => {
      const taskRepository = createMockTaskRepository();
      const pendingTask = makeTask({ status: "pending" });
      const inProgressTask = makeTask({ status: "in_progress" });

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(pendingTask);
      vi.mocked(taskRepository.updateStatus).mockResolvedValue(inProgressTask);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        createMockAgentReader(),
      );
      const result = await service.updateTaskStatus(pendingTask.uuid, {
        status: "in_progress",
      });

      expect(result).toEqual(inProgressTask);
      expect(taskRepository.updateStatus).toHaveBeenCalledWith(
        pendingTask.uuid,
        "in_progress",
      );
    });

    it("should throw NotFoundError when task does not exist", async () => {
      const taskRepository = createMockTaskRepository();
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        createMockAgentReader(),
      );

      await expect(
        service.updateTaskStatus("nonexistent", { status: "completed" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when status is invalid", async () => {
      const service = new TaskService(
        createMockTaskRepository(),
        createMockProjectReader(),
        createMockAgentReader(),
      );

      await expect(
        service.updateTaskStatus(TASK_UUID, { status: "invalid" }),
      ).rejects.toThrow(ValidationError);
    });
  });
});