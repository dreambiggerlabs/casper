import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { DrizzleTaskRepository } from "../../../src/task/task.repository.js";
import {
  createTestDatabase,
  truncateAllTables,
  closeTestDatabase,
} from "../../helpers/test-database.js";
import {
  createTestProject,
  createTestAgent,
  resetFixtureCounter,
} from "../../helpers/fixtures.js";

const { db, client } = await createTestDatabase();
const repo = new DrizzleTaskRepository(db);

afterAll(async () => {
  await closeTestDatabase(client);
});

beforeEach(async () => {
  await truncateAllTables(db);
  resetFixtureCounter();
});

describe("DrizzleTaskRepository", () => {
  describe("create", () => {
    it("should insert a task linked to a project", async () => {
      const project = await createTestProject(db);
      const task = await repo.create({
        title: "My Task",
        projectId: project.uuid,
      });

      expect(task.uuid).toBeDefined();
      expect(task["@id"]).toBe(`/tasks/${task.uuid}`);
      expect(task.title).toBe("My Task");
      expect(task.project).toBe(`/projects/${project.uuid}`);
      expect(task.status).toBe("backlog");
      expect(task.agent).toBeNull();
      expect(task.parent).toBeNull();
    });

    it("should throw when projectId does not exist (FK violation)", async () => {
      await expect(
        repo.create({
          title: "Orphan Task",
          projectId: "00000000-0000-0000-0000-000000000000",
        }),
      ).rejects.toThrow();
    });
  });

  describe("findByUuid", () => {
    it("should return the task when it exists", async () => {
      const project = await createTestProject(db);
      const created = await repo.create({
        title: "Find Me",
        projectId: project.uuid,
      });

      const found = await repo.findByUuid(created.uuid);
      expect(found).toBeDefined();
      expect(found!.uuid).toBe(created.uuid);
    });

    it("should return undefined for non-existent uuid", async () => {
      const found = await repo.findByUuid(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeUndefined();
    });
  });

  describe("findByProjectId", () => {
    it("should return tasks only for the specified project", async () => {
      const projectA = await createTestProject(db);
      const projectB = await createTestProject(db);

      await repo.create({ title: "Task A1", projectId: projectA.uuid });
      await repo.create({ title: "Task A2", projectId: projectA.uuid });
      await repo.create({ title: "Task B1", projectId: projectB.uuid });

      const tasksA = await repo.findByProjectId(projectA.uuid);
      expect(tasksA).toHaveLength(2);
      expect(tasksA.every((t) => t.project === `/projects/${projectA.uuid}`)).toBe(true);
    });
  });

  describe("findByStatusAndAgentId", () => {
    it("should filter by both status and agent", async () => {
      const project = await createTestProject(db);
      const agent = await createTestAgent(db);

      const task = await repo.create({
        title: "Assigned Ready",
        projectId: project.uuid,
      });
      await repo.assign(task.uuid, agent.uuid);
      await repo.updateStatus(task.uuid, "ready");

      // Another task, different status
      await repo.create({ title: "Backlog", projectId: project.uuid });

      const results = await repo.findByStatusAndAgentId("ready", agent.uuid);
      expect(results).toHaveLength(1);
      expect(results[0]!.title).toBe("Assigned Ready");
    });
  });

  describe("count", () => {
    it("should count all tasks", async () => {
      const project = await createTestProject(db);
      await repo.create({ title: "T1", projectId: project.uuid });
      await repo.create({ title: "T2", projectId: project.uuid });

      expect(await repo.count()).toBe(2);
    });

    it("should count with status filter", async () => {
      const project = await createTestProject(db);
      const t1 = await repo.create({ title: "T1", projectId: project.uuid });
      await repo.create({ title: "T2", projectId: project.uuid });
      await repo.updateStatus(t1.uuid, "ready");

      expect(await repo.count({ status: "ready" })).toBe(1);
      expect(await repo.count({ status: "backlog" })).toBe(1);
    });

    it("should count with projectId filter", async () => {
      const p1 = await createTestProject(db);
      const p2 = await createTestProject(db);
      await repo.create({ title: "T1", projectId: p1.uuid });
      await repo.create({ title: "T2", projectId: p2.uuid });

      expect(await repo.count({ projectId: p1.uuid })).toBe(1);
    });
  });

  describe("findPaginated", () => {
    it("should paginate with filters", async () => {
      const project = await createTestProject(db);
      for (let i = 0; i < 5; i++) {
        const t = await repo.create({
          title: `Task ${i}`,
          projectId: project.uuid,
        });
        if (i < 3) await repo.updateStatus(t.uuid, "ready");
      }

      const readyTasks = await repo.findPaginated({
        limit: 2,
        offset: 0,
        status: "ready",
      });
      expect(readyTasks).toHaveLength(2);

      const allReady = await repo.findPaginated({
        limit: 10,
        offset: 0,
        status: "ready",
      });
      expect(allReady).toHaveLength(3);
    });
  });

  describe("update", () => {
    it("should update the task title", async () => {
      const project = await createTestProject(db);
      const task = await repo.create({
        title: "Original",
        projectId: project.uuid,
      });

      const updated = await repo.update(task.uuid, { title: "Updated" });
      expect(updated!.title).toBe("Updated");
      expect(updated!.updatedAt).toBeInstanceOf(Date);
    });

    it("should return undefined for non-existent task", async () => {
      const result = await repo.update(
        "00000000-0000-0000-0000-000000000000",
        { title: "Nope" },
      );
      expect(result).toBeUndefined();
    });
  });

  describe("assign", () => {
    it("should assign an agent to a task", async () => {
      const project = await createTestProject(db);
      const agent = await createTestAgent(db);
      const task = await repo.create({
        title: "Assign Me",
        projectId: project.uuid,
      });

      const assigned = await repo.assign(task.uuid, agent.uuid);
      expect(assigned!.agent).toBe(`/agents/${agent.uuid}`);
    });
  });

  describe("updateStatus", () => {
    it("should update task status", async () => {
      const project = await createTestProject(db);
      const task = await repo.create({
        title: "Status Change",
        projectId: project.uuid,
      });

      const ready = await repo.updateStatus(task.uuid, "ready");
      expect(ready!.status).toBe("ready");

      const inProgress = await repo.updateStatus(task.uuid, "in_progress");
      expect(inProgress!.status).toBe("in_progress");

      const completed = await repo.updateStatus(task.uuid, "completed");
      expect(completed!.status).toBe("completed");
    });
  });

  describe("parent task relationship", () => {
    it("should create a child task with parentId", async () => {
      const project = await createTestProject(db);
      const parent = await repo.create({
        title: "Parent",
        projectId: project.uuid,
      });
      const child = await repo.create({
        title: "Child",
        projectId: project.uuid,
        parentId: parent.uuid,
      });

      expect(child.parent).toBe(`/tasks/${parent.uuid}`);
    });

    it("should throw when parentId does not exist (FK violation)", async () => {
      const project = await createTestProject(db);
      await expect(
        repo.create({
          title: "Orphan",
          projectId: project.uuid,
          parentId: "00000000-0000-0000-0000-000000000000",
        }),
      ).rejects.toThrow();
    });
  });
});
