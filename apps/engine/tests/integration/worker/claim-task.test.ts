import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { DrizzleWorkerRepository } from "../../../src/worker/infrastructure/repository/drizzle-worker.repository.js";
import { DrizzleWorkerJobRepository } from "../../../src/worker/infrastructure/repository/drizzle-worker-job.repository.js";
import { WorkerService } from "../../../src/worker/application/service/worker.service.js";
import {
  createTestDatabase,
  truncateAllTables,
  closeTestDatabase,
} from "../../helpers/test-database.js";
import {
  createTestProject,
  createTestAgent,
  createTestUser,
  createTestTask,
  createTestWorker,
  resetFixtureCounter,
} from "../../helpers/fixtures.js";

const { db, client } = await createTestDatabase();

const workerRepository = new DrizzleWorkerRepository(db);
const workerJobRepository = new DrizzleWorkerJobRepository(db);
const service = new WorkerService(workerRepository, workerJobRepository);

afterAll(async () => {
  await closeTestDatabase(client);
});

beforeEach(async () => {
  await truncateAllTables(db);
  resetFixtureCounter();
});

describe("claimTask (integration)", () => {
  it("should claim a ready task with an assigned agent", async () => {
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    const worker = await createTestWorker(db);
    const task = await createTestTask(db, {
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "ready",
    });

    const result = await service.claimTask({
      worker: `/workers/${worker.uuid}`,
    });

    expect(result).not.toBeNull();
    expect(result!.task.uuid).toBe(task.uuid);
    expect(result!.task.status).toBe("in_progress");
    expect(result!.job.worker).toBe(`/workers/${worker.uuid}`);
    expect(result!.job.type).toBe("execute_task");
    expect(result!.job.task).toBe(`/tasks/${task.uuid}`);
  });

  it("should return null when no ready tasks exist", async () => {
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    const worker = await createTestWorker(db);

    // Task in backlog (not ready)
    await createTestTask(db, {
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "backlog",
    });

    const result = await service.claimTask({
      worker: `/workers/${worker.uuid}`,
    });

    expect(result).toBeNull();
  });

  it("should NOT claim a ready task without an assigned agent", async () => {
    const project = await createTestProject(db);
    const worker = await createTestWorker(db);

    // Task is ready but has NO assignee
    await createTestTask(db, {
      projectId: project.uuid,
      status: "ready",
    });

    const result = await service.claimTask({
      worker: `/workers/${worker.uuid}`,
    });

    expect(result).toBeNull();
  });

  it("should NOT claim a ready task assigned to a user", async () => {
    const project = await createTestProject(db);
    const user = await createTestUser(db);
    const worker = await createTestWorker(db);

    await createTestTask(db, {
      projectId: project.uuid,
      assignee: { type: "user", uuid: user.uuid },
      status: "ready",
    });

    const result = await service.claimTask({
      worker: `/workers/${worker.uuid}`,
    });

    expect(result).toBeNull();
  });

  it("should skip user-assigned ready tasks and claim agent-assigned tasks", async () => {
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    const user = await createTestUser(db);
    const worker = await createTestWorker(db);

    // Older user task (should be skipped)
    await createTestTask(db, {
      title: "User task",
      projectId: project.uuid,
      assignee: { type: "user", uuid: user.uuid },
      status: "ready",
    });

    const agentTask = await createTestTask(db, {
      title: "Agent task",
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "ready",
    });

    const result = await service.claimTask({
      worker: `/workers/${worker.uuid}`,
    });

    expect(result).not.toBeNull();
    expect(result!.task.uuid).toBe(agentTask.uuid);
    expect(result!.task.assignee).toBe(`/agents/${agent.uuid}`);
  });

  it("should not claim a task that is already in_progress", async () => {
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    const worker = await createTestWorker(db);

    await createTestTask(db, {
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "in_progress",
    });

    const result = await service.claimTask({
      worker: `/workers/${worker.uuid}`,
    });

    expect(result).toBeNull();
  });

  it("should claim the oldest ready task first (FIFO order)", async () => {
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    const worker = await createTestWorker(db);

    // Create tasks in order - the fixture creates them sequentially
    const task1 = await createTestTask(db, {
      title: "First",
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "ready",
    });
    await createTestTask(db, {
      title: "Second",
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "ready",
    });
    await createTestTask(db, {
      title: "Third",
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "ready",
    });

    const result = await service.claimTask({
      worker: `/workers/${worker.uuid}`,
    });

    expect(result).not.toBeNull();
    expect(result!.task.uuid).toBe(task1.uuid);
  });

  it("should handle concurrent claims - only one worker wins per task", async () => {
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    const worker1 = await createTestWorker(db, { name: "Worker A" });
    const worker2 = await createTestWorker(db, { name: "Worker B" });

    // Only one ready task
    await createTestTask(db, {
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "ready",
    });

    // Both try to claim simultaneously
    const [result1, result2] = await Promise.all([
      service.claimTask({ worker: `/workers/${worker1.uuid}` }),
      service.claimTask({ worker: `/workers/${worker2.uuid}` }),
    ]);

    // Exactly one should succeed
    const successes = [result1, result2].filter((r) => r !== null);
    expect(successes).toHaveLength(1);
  });

  it("should distribute multiple tasks across multiple concurrent workers", async () => {
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    const worker1 = await createTestWorker(db, { name: "W1" });
    const worker2 = await createTestWorker(db, { name: "W2" });
    const worker3 = await createTestWorker(db, { name: "W3" });

    // Create 3 ready tasks
    await createTestTask(db, {
      title: "T1",
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "ready",
    });
    await createTestTask(db, {
      title: "T2",
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "ready",
    });
    await createTestTask(db, {
      title: "T3",
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "ready",
    });

    // All three claim concurrently
    const results = await Promise.all([
      service.claimTask({ worker: `/workers/${worker1.uuid}` }),
      service.claimTask({ worker: `/workers/${worker2.uuid}` }),
      service.claimTask({ worker: `/workers/${worker3.uuid}` }),
    ]);

    const successes = results.filter((r) => r !== null);
    expect(successes).toHaveLength(3);

    // Each got a different task
    const taskUuids = successes.map((r) => r!.task.uuid);
    const uniqueTaskUuids = new Set(taskUuids);
    expect(uniqueTaskUuids.size).toBe(3);
  });

  it("should throw NotFoundError when worker does not exist", async () => {
    await expect(
      service.claimTask({
        worker: "/workers/00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow("not found");
  });

  it("should only claim tasks with agent, ignoring unassigned ready tasks", async () => {
    const project = await createTestProject(db);
    const agent = await createTestAgent(db);
    const worker = await createTestWorker(db);

    // Create an unassigned ready task (should be skipped)
    await createTestTask(db, {
      title: "Unassigned",
      projectId: project.uuid,
      status: "ready",
    });

    // Create an assigned ready task (should be claimed)
    const assignedTask = await createTestTask(db, {
      title: "Assigned",
      projectId: project.uuid,
      assignee: { type: "agent", uuid: agent.uuid },
      status: "ready",
    });

    const result = await service.claimTask({
      worker: `/workers/${worker.uuid}`,
    });

    expect(result).not.toBeNull();
    expect(result!.task.uuid).toBe(assignedTask.uuid);
    expect(result!.task.assignee).toBe(`/agents/${agent.uuid}`);
  });
});
