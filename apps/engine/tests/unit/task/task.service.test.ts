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
    count: vi.fn(),
    findPaginated: vi.fn(),
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
    count: vi.fn(),
    findPaginated: vi.fn(),
  };
}

function createMockAgentReader(): AgentReader {
  return {
    findByUuid: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    findPaginated: vi.fn(),
  };
}

const AGENT_UUID = "550e8400-e29b-41d4-a716-446655440002";
const PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";
const TASK_UUID = "550e8400-e29b-41d4-a716-446655440001";

function makeTask(overrides: Partial<Task> = {}): Task {
  const uuid = overrides.uuid ?? TASK_UUID;
  return {
    "@id": `/tasks/${uuid}`,
    uuid,
    title: "Test Task",
    project: `/projects/${PROJECT_UUID}`,
    parent: null,
    status: "backlog",
    agent: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeProject(uuid: string = PROJECT_UUID) {
  return {
    "@id": `/projects/${uuid}`,
    uuid,
    title: "Test Project",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("TaskService", () => {
  describe("createTask", () => {
    it("should create a task when valid data is provided and project exists", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();
      const agentReader = createMockAgentReader();
      const expectedTask = makeTask({ title: "My Task" });

      vi.mocked(projectReader.findByUuid).mockResolvedValue(
        makeProject(PROJECT_UUID),
      );
      vi.mocked(taskRepository.create).mockResolvedValue(expectedTask);

      const service = new TaskService(
        taskRepository,
        projectReader,
        agentReader,
      );
      const result = await service.createTask({
        title: "My Task",
        project: `/projects/${PROJECT_UUID}`,
      });

      expect(result).toEqual(expectedTask);
      expect(taskRepository.create).toHaveBeenCalledWith({
        title: "My Task",
        projectId: PROJECT_UUID,
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
          project: "/projects/550e8400-e29b-41d4-a716-446655440999",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when parent task does not exist", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();
      const agentReader = createMockAgentReader();

      vi.mocked(projectReader.findByUuid).mockResolvedValue(
        makeProject(PROJECT_UUID),
      );
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        projectReader,
        agentReader,
      );

      await expect(
        service.createTask({
          title: "My Task",
          project: `/projects/${PROJECT_UUID}`,
          parent: "/tasks/550e8400-e29b-41d4-a716-446655440998",
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
        service.createTask({ project: `/projects/${PROJECT_UUID}` }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when project is missing", async () => {
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
    const pagination = { page: 1, itemsPerPage: 30 };

    it("should return paginated tasks when no filters provided", async () => {
      const taskRepository = createMockTaskRepository();
      const tasks = [makeTask(), makeTask({ uuid: "other-uuid" })];
      vi.mocked(taskRepository.findPaginated).mockResolvedValue(tasks);
      vi.mocked(taskRepository.count).mockResolvedValue(2);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        createMockAgentReader(),
      );
      const result = await service.listTasks(undefined, pagination);

      expect(result).toEqual({ items: tasks, totalItems: 2 });
      expect(taskRepository.findPaginated).toHaveBeenCalledWith({
        limit: 30,
        offset: 0,
        status: undefined,
        agentId: undefined,
      });
    });

    it("should return paginated tasks filtered by status and agentId", async () => {
      const taskRepository = createMockTaskRepository();
      const tasks = [
        makeTask({ status: "ready", agent: `/agents/${AGENT_UUID}` }),
      ];
      vi.mocked(taskRepository.findPaginated).mockResolvedValue(tasks);
      vi.mocked(taskRepository.count).mockResolvedValue(1);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        createMockAgentReader(),
      );
      const result = await service.listTasks(
        { status: "ready", agentId: AGENT_UUID },
        pagination,
      );

      expect(result).toEqual({ items: tasks, totalItems: 1 });
      expect(taskRepository.findPaginated).toHaveBeenCalledWith({
        limit: 30,
        offset: 0,
        status: "ready",
        agentId: AGENT_UUID,
      });
    });

    it("should throw ValidationError when status is invalid", async () => {
      const service = new TaskService(
        createMockTaskRepository(),
        createMockProjectReader(),
        createMockAgentReader(),
      );

      await expect(
        service.listTasks({ status: "invalid", agentId: AGENT_UUID }, pagination),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("listTasksByProject", () => {
    const pagination = { page: 1, itemsPerPage: 30 };

    it("should return paginated tasks for a given project when project exists", async () => {
      const taskRepository = createMockTaskRepository();
      const projectReader = createMockProjectReader();
      const projectId = "project-uuid";
      const tasks = [
        makeTask({ project: `/projects/${projectId}` }),
        makeTask({ project: `/projects/${projectId}` }),
      ];

      vi.mocked(projectReader.findByUuid).mockResolvedValue(
        makeProject(projectId),
      );
      vi.mocked(taskRepository.findPaginated).mockResolvedValue(tasks);
      vi.mocked(taskRepository.count).mockResolvedValue(2);

      const service = new TaskService(
        taskRepository,
        projectReader,
        createMockAgentReader(),
      );
      const result = await service.listTasksByProject(projectId, pagination);

      expect(result).toEqual({ items: tasks, totalItems: 2 });
      expect(taskRepository.findPaginated).toHaveBeenCalledWith({
        limit: 30,
        offset: 0,
        projectId,
      });
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

      await expect(
        service.listTasksByProject("nonexistent", pagination),
      ).rejects.toThrow(NotFoundError);
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
          project: "/projects/550e8400-e29b-41d4-a716-446655440999",
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
          parent: "/tasks/550e8400-e29b-41d4-a716-446655440998",
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("assignTask", () => {
    it("should assign an agent to a task without changing status", async () => {
      const taskRepository = createMockTaskRepository();
      const agentReader = createMockAgentReader();
      const task = makeTask({ status: "ready" });
      const taskWithAgent = makeTask({ status: "ready", agent: `/agents/${AGENT_UUID}` });

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(task);
      vi.mocked(agentReader.findByUuid).mockResolvedValue({
        "@id": `/agents/${AGENT_UUID}`,
        uuid: AGENT_UUID,
        name: "Test Agent",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(taskRepository.assign).mockResolvedValue(taskWithAgent);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        agentReader,
      );
      const result = await service.assignTask(task.uuid, {
        agent: `/agents/${AGENT_UUID}`,
      });

      expect(result).toEqual(taskWithAgent);
      expect(taskRepository.assign).toHaveBeenCalledWith(
        task.uuid,
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
        service.assignTask("nonexistent", { agent: `/agents/${AGENT_UUID}` }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when agent does not exist", async () => {
      const taskRepository = createMockTaskRepository();
      const agentReader = createMockAgentReader();
      const task = makeTask();

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(task);
      vi.mocked(agentReader.findByUuid).mockResolvedValue(undefined);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        agentReader,
      );

      await expect(
        service.assignTask(task.uuid, { agent: `/agents/${AGENT_UUID}` }),
      ).rejects.toThrow(NotFoundError);
    });

    it("should allow assigning an agent to a task in any status", async () => {
      const taskRepository = createMockTaskRepository();
      const agentReader = createMockAgentReader();
      const inProgressTask = makeTask({
        status: "in_progress",
        agent: "/agents/550e8400-e29b-41d4-a716-446655440003",
      });
      const reassignedTask = makeTask({
        status: "in_progress",
        agent: `/agents/${AGENT_UUID}`,
      });

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(inProgressTask);
      vi.mocked(agentReader.findByUuid).mockResolvedValue({
        "@id": `/agents/${AGENT_UUID}`,
        uuid: AGENT_UUID,
        name: "Test Agent",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(taskRepository.assign).mockResolvedValue(reassignedTask);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        agentReader,
      );
      const result = await service.assignTask(inProgressTask.uuid, {
        agent: `/agents/${AGENT_UUID}`,
      });

      expect(result).toEqual(reassignedTask);
    });

    it("should throw ValidationError when agent IRI is invalid", async () => {
      const service = new TaskService(
        createMockTaskRepository(),
        createMockProjectReader(),
        createMockAgentReader(),
      );

      await expect(
        service.assignTask(TASK_UUID, { agent: "not-an-iri" }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("updateTaskStatus", () => {
    it("should update task status", async () => {
      const taskRepository = createMockTaskRepository();
      const readyTask = makeTask({ status: "ready" });
      const inProgressTask = makeTask({ status: "in_progress" });

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(readyTask);
      vi.mocked(taskRepository.updateStatus).mockResolvedValue(inProgressTask);

      const service = new TaskService(
        taskRepository,
        createMockProjectReader(),
        createMockAgentReader(),
      );
      const result = await service.updateTaskStatus(readyTask.uuid, {
        status: "in_progress",
      });

      expect(result).toEqual(inProgressTask);
      expect(taskRepository.updateStatus).toHaveBeenCalledWith(
        readyTask.uuid,
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
