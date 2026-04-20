import { describe, it, expect, vi } from "vitest";

import { NotFoundError } from "../../../src/shared/domain/error/not-found.error.js";
import { ValidationError } from "../../../src/shared/domain/error/validation.error.js";
import { ReferenceResolver } from "../../../src/shared/application/reference/reference-resolver.js";

import type { ProjectReader } from "../../../src/project/application/port/project.repository.js";
import type { AgentReader } from "../../../src/agent/application/port/agent.repository.js";
import type { UserReader } from "../../../src/user/application/port/user.repository.js";

import { TaskService } from "../../../src/task/application/service/task.service.js";
import type { TaskRepository } from "../../../src/task/application/port/task.repository.js";
import type { Task } from "../../../src/task/domain/entity/task.entity.js";
import type { AssigneeRef } from "../../../src/task/domain/value-object/assignee.value-object.js";
import type { TaskStatus } from "../../../src/task/domain/value-object/task-status.value-object.js";

function createMockTaskRepository(): TaskRepository {
  return {
    findByUuid: vi.fn(),
    findByProjectId: vi.fn(),
    findByStatusAndAssignee: vi.fn(),
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

function createMockUserReader(): UserReader {
  return {
    findByUuid: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
    findPaginated: vi.fn(),
  };
}

const AGENT_UUID = "550e8400-e29b-41d4-a716-446655440002";
const USER_UUID = "550e8400-e29b-41d4-a716-446655440020";
const PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";
const TASK_UUID = "550e8400-e29b-41d4-a716-446655440001";

function makeTask(overrides: Partial<Task> = {}): Task {
  const uuid = overrides.uuid ?? TASK_UUID;
  return {
    "@id": `/tasks/${uuid}`,
    uuid,
    title: "Test Task",
    description: null,
    project: `/projects/${PROJECT_UUID}`,
    parent: null,
    status: "backlog",
    assignee: null,
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

function makeAgent(uuid: string = AGENT_UUID) {
  return {
    "@id": `/agents/${uuid}`,
    uuid,
    name: "Test Agent",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeUser(uuid: string = USER_UUID) {
  return {
    "@id": `/users/${uuid}`,
    uuid,
    name: "Test User",
    email: "test@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeService(overrides: {
  taskRepository?: TaskRepository;
  projectReader?: ProjectReader;
  agentReader?: AgentReader;
  userReader?: UserReader;
} = {}) {
  const taskRepository = overrides.taskRepository ?? createMockTaskRepository();
  const projectReader = overrides.projectReader ?? createMockProjectReader();
  const agentReader = overrides.agentReader ?? createMockAgentReader();
  const userReader = overrides.userReader ?? createMockUserReader();

  const projectResolver = new ReferenceResolver<"projects">({
    projects: projectReader,
  });
  const assigneeResolver = new ReferenceResolver<"agents" | "users">({
    agents: agentReader,
    users: userReader,
  });

  return {
    service: new TaskService(
      taskRepository,
      projectResolver,
      assigneeResolver,
    ),
    taskRepository,
    projectReader,
    agentReader,
    userReader,
  };
}

describe("TaskService", () => {
  describe("createTask", () => {
    it("creates a task when valid data is provided and project exists", async () => {
      const { service, taskRepository, projectReader } = makeService();
      const expectedTask = makeTask({ title: "My Task" });

      vi.mocked(projectReader.findByUuid).mockResolvedValue(makeProject());
      vi.mocked(taskRepository.create).mockResolvedValue(expectedTask);

      const result = await service.createTask({
        title: "My Task",
        project: `/projects/${PROJECT_UUID}`,
      });

      expect(result).toEqual(expectedTask);
      expect(taskRepository.create).toHaveBeenCalledWith({
        title: "My Task",
        description: undefined,
        projectId: PROJECT_UUID,
        parentId: undefined,
      });
    });

    it("throws NotFoundError when project is missing", async () => {
      const { service, projectReader } = makeService();
      vi.mocked(projectReader.findByUuid).mockResolvedValue(undefined);

      await expect(
        service.createTask({
          title: "My Task",
          project: "/projects/550e8400-e29b-41d4-a716-446655440999",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when parent task does not exist", async () => {
      const { service, taskRepository, projectReader } = makeService();
      vi.mocked(projectReader.findByUuid).mockResolvedValue(makeProject());
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      await expect(
        service.createTask({
          title: "My Task",
          project: `/projects/${PROJECT_UUID}`,
          parent: "/tasks/550e8400-e29b-41d4-a716-446655440998",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError when title is missing", async () => {
      const { service } = makeService();

      await expect(
        service.createTask({ project: `/projects/${PROJECT_UUID}` }),
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when project is missing", async () => {
      const { service } = makeService();

      await expect(service.createTask({ title: "My Task" })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("getTask", () => {
    it("returns a task when it exists", async () => {
      const { service, taskRepository } = makeService();
      const expected = makeTask();
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(expected);

      const result = await service.getTask(expected.uuid);

      expect(result).toEqual(expected);
    });

    it("throws NotFoundError when task does not exist", async () => {
      const { service, taskRepository } = makeService();
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      await expect(service.getTask("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("listTasks", () => {
    const pagination = { page: 1, itemsPerPage: 30 };

    it("returns paginated tasks when no filters provided", async () => {
      const { service, taskRepository } = makeService();
      const tasks = [makeTask(), makeTask({ uuid: "other-uuid" })];
      vi.mocked(taskRepository.findPaginated).mockResolvedValue(tasks);
      vi.mocked(taskRepository.count).mockResolvedValue(2);

      const result = await service.listTasks(undefined, pagination);

      expect(result).toEqual({ items: tasks, totalItems: 2 });
      expect(taskRepository.findPaginated).toHaveBeenCalledWith({
        limit: 30,
        offset: 0,
        status: undefined,
        assignee: undefined,
      });
    });

    it("filters by status and agent assignee", async () => {
      const { service, taskRepository } = makeService();
      const tasks = [
        makeTask({ status: "ready", assignee: `/agents/${AGENT_UUID}` }),
      ];
      vi.mocked(taskRepository.findPaginated).mockResolvedValue(tasks);
      vi.mocked(taskRepository.count).mockResolvedValue(1);

      const result = await service.listTasks(
        { status: "ready", assignee: { type: "agent", uuid: AGENT_UUID } },
        pagination,
      );

      expect(result).toEqual({ items: tasks, totalItems: 1 });
      expect(taskRepository.findPaginated).toHaveBeenCalledWith({
        limit: 30,
        offset: 0,
        status: "ready",
        assignee: { type: "agent", uuid: AGENT_UUID },
      });
    });

    it("filters by user assignee", async () => {
      const { service, taskRepository } = makeService();
      const tasks = [makeTask({ assignee: `/users/${USER_UUID}` })];
      vi.mocked(taskRepository.findPaginated).mockResolvedValue(tasks);
      vi.mocked(taskRepository.count).mockResolvedValue(1);

      await service.listTasks(
        { assignee: { type: "user", uuid: USER_UUID } },
        pagination,
      );

      expect(taskRepository.findPaginated).toHaveBeenCalledWith({
        limit: 30,
        offset: 0,
        status: undefined,
        assignee: { type: "user", uuid: USER_UUID },
      });
    });

    it("throws ValidationError when status is invalid", async () => {
      const { service } = makeService();

      await expect(
        service.listTasks({ status: "invalid" }, pagination),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("listTasksByProject", () => {
    const pagination = { page: 1, itemsPerPage: 30 };

    it("returns paginated tasks for a project that exists", async () => {
      const { service, taskRepository, projectReader } = makeService();
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

      const result = await service.listTasksByProject(projectId, pagination);

      expect(result).toEqual({ items: tasks, totalItems: 2 });
      expect(taskRepository.findPaginated).toHaveBeenCalledWith({
        limit: 30,
        offset: 0,
        projectId,
      });
    });

    it("throws NotFoundError when project does not exist", async () => {
      const { service, projectReader } = makeService();
      vi.mocked(projectReader.findByUuid).mockResolvedValue(undefined);

      await expect(
        service.listTasksByProject("nonexistent", pagination),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateTask", () => {
    it("updates a task when valid data is provided", async () => {
      const { service, taskRepository } = makeService();
      const expected = makeTask({ title: "Updated" });
      vi.mocked(taskRepository.update).mockResolvedValue(expected);

      const result = await service.updateTask(expected.uuid, {
        title: "Updated",
      });

      expect(result).toEqual(expected);
    });

    it("throws NotFoundError when updating a non-existent task", async () => {
      const { service, taskRepository } = makeService();
      vi.mocked(taskRepository.update).mockResolvedValue(undefined);

      await expect(
        service.updateTask("nonexistent", { title: "Updated" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError when no fields are provided", async () => {
      const { service } = makeService();

      await expect(service.updateTask("some-uuid", {})).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("assignTask", () => {
    it("assigns an agent to a task", async () => {
      const { service, taskRepository, agentReader } = makeService();
      const task = makeTask({ status: "ready" });
      const assigned = makeTask({
        status: "ready",
        assignee: `/agents/${AGENT_UUID}`,
      });

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(task);
      vi.mocked(agentReader.findByUuid).mockResolvedValue(makeAgent());
      vi.mocked(taskRepository.assign).mockResolvedValue(assigned);

      const result = await service.assignTask(task.uuid, {
        assignee: `/agents/${AGENT_UUID}`,
      });

      expect(result).toEqual(assigned);
      expect(taskRepository.assign).toHaveBeenCalledWith(task.uuid, {
        type: "agent",
        uuid: AGENT_UUID,
      });
    });

    it("assigns a user to a task", async () => {
      const { service, taskRepository, userReader } = makeService();
      const task = makeTask();
      const assigned = makeTask({ assignee: `/users/${USER_UUID}` });

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(task);
      vi.mocked(userReader.findByUuid).mockResolvedValue(makeUser());
      vi.mocked(taskRepository.assign).mockResolvedValue(assigned);

      const result = await service.assignTask(task.uuid, {
        assignee: `/users/${USER_UUID}`,
      });

      expect(result).toEqual(assigned);
      expect(taskRepository.assign).toHaveBeenCalledWith(task.uuid, {
        type: "user",
        uuid: USER_UUID,
      });
      expect(userReader.findByUuid).toHaveBeenCalledWith(USER_UUID);
    });

    it("throws NotFoundError when task does not exist", async () => {
      const { service, taskRepository } = makeService();
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      await expect(
        service.assignTask("nonexistent", { assignee: `/agents/${AGENT_UUID}` }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when agent does not exist", async () => {
      const { service, taskRepository, agentReader } = makeService();
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(makeTask());
      vi.mocked(agentReader.findByUuid).mockResolvedValue(undefined);

      await expect(
        service.assignTask(TASK_UUID, { assignee: `/agents/${AGENT_UUID}` }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when user does not exist", async () => {
      const { service, taskRepository, userReader } = makeService();
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(makeTask());
      vi.mocked(userReader.findByUuid).mockResolvedValue(undefined);

      await expect(
        service.assignTask(TASK_UUID, { assignee: `/users/${USER_UUID}` }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError when assignee IRI is not agent or user", async () => {
      const { service } = makeService();

      await expect(
        service.assignTask(TASK_UUID, { assignee: `/projects/${PROJECT_UUID}` }),
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when assignee IRI is malformed", async () => {
      const { service } = makeService();

      await expect(
        service.assignTask(TASK_UUID, { assignee: "not-an-iri" }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("updateTaskStatus", () => {
    it("updates task status", async () => {
      const { service, taskRepository } = makeService();
      const readyTask = makeTask({ status: "ready" });
      const inProgressTask = makeTask({ status: "in_progress" });

      vi.mocked(taskRepository.findByUuid).mockResolvedValue(readyTask);
      vi.mocked(taskRepository.updateStatus).mockResolvedValue(inProgressTask);

      const result = await service.updateTaskStatus(readyTask.uuid, {
        status: "in_progress",
      });

      expect(result).toEqual(inProgressTask);
      expect(taskRepository.updateStatus).toHaveBeenCalledWith(
        readyTask.uuid,
        "in_progress",
      );
    });

    it("throws NotFoundError when task does not exist", async () => {
      const { service, taskRepository } = makeService();
      vi.mocked(taskRepository.findByUuid).mockResolvedValue(undefined);

      await expect(
        service.updateTaskStatus("nonexistent", { status: "completed" }),
      ).rejects.toThrow(NotFoundError);
    });

    it("throws ValidationError when status is invalid", async () => {
      const { service } = makeService();

      await expect(
        service.updateTaskStatus(TASK_UUID, { status: "invalid" }),
      ).rejects.toThrow(ValidationError);
    });
  });
});
