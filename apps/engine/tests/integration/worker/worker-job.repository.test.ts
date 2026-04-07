import { describe, it, expect, beforeEach, afterAll } from "vitest";

import { DrizzleWorkerJobRepository } from "../../../src/worker/worker.repository.js";
import {
  createTestDatabase,
  truncateAllTables,
  closeTestDatabase,
} from "../../helpers/test-database.js";
import {
  createTestProject,
  createTestAgent,
  createTestTask,
  createTestWorker,
  resetFixtureCounter,
} from "../../helpers/fixtures.js";

const { db, client } = await createTestDatabase();
const repo = new DrizzleWorkerJobRepository(db);

afterAll(async () => {
  await closeTestDatabase(client);
});

beforeEach(async () => {
  await truncateAllTables(db);
  resetFixtureCounter();
});

describe("DrizzleWorkerJobRepository", () => {
  describe("createJob", () => {
    it("should create a job linked to a worker", async () => {
      const worker = await createTestWorker(db);
      const job = await repo.createJob(worker.uuid, { type: "execute_task" });

      expect(job.uuid).toBeDefined();
      expect(job["@id"]).toBe(`/jobs/${job.uuid}`);
      expect(job.worker).toBe(`/workers/${worker.uuid}`);
      expect(job.type).toBe("execute_task");
      expect(job.status).toBe("ready");
      expect(job.task).toBeNull();
      expect(job.failReason).toBeNull();
    });

    it("should create a job linked to a task", async () => {
      const project = await createTestProject(db);
      const worker = await createTestWorker(db);
      const task = await createTestTask(db, { projectId: project.uuid });

      const job = await repo.createJob(worker.uuid, {
        type: "execute_task",
        taskId: task.uuid,
      });

      expect(job.task).toBe(`/tasks/${task.uuid}`);
    });
  });

  describe("findJobByUuid", () => {
    it("should return the job when it exists", async () => {
      const worker = await createTestWorker(db);
      const created = await repo.createJob(worker.uuid, {
        type: "cleanup",
      });

      const found = await repo.findJobByUuid(created.uuid);
      expect(found).toBeDefined();
      expect(found!.uuid).toBe(created.uuid);
    });

    it("should return undefined for non-existent uuid", async () => {
      const found = await repo.findJobByUuid(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeUndefined();
    });
  });

  describe("findJobsByWorkerId", () => {
    it("should return jobs for a specific worker", async () => {
      const worker1 = await createTestWorker(db);
      const worker2 = await createTestWorker(db);

      await repo.createJob(worker1.uuid, { type: "execute_task" });
      await repo.createJob(worker1.uuid, { type: "cleanup" });
      await repo.createJob(worker2.uuid, { type: "execute_task" });

      const jobs = await repo.findJobsByWorkerId(worker1.uuid);
      expect(jobs).toHaveLength(2);
    });

    it("should filter by status", async () => {
      const worker = await createTestWorker(db);
      const job = await repo.createJob(worker.uuid, { type: "execute_task" });
      await repo.updateJobStatus(job.uuid, "in_progress");
      await repo.createJob(worker.uuid, { type: "cleanup" });

      const readyJobs = await repo.findJobsByWorkerId(worker.uuid, "ready");
      expect(readyJobs).toHaveLength(1);

      const inProgressJobs = await repo.findJobsByWorkerId(
        worker.uuid,
        "in_progress",
      );
      expect(inProgressJobs).toHaveLength(1);
    });
  });

  describe("findJobByTaskId", () => {
    it("should return the non-failed job for a task", async () => {
      const project = await createTestProject(db);
      const worker = await createTestWorker(db);
      const task = await createTestTask(db, { projectId: project.uuid });

      const job = await repo.createJob(worker.uuid, {
        type: "execute_task",
        taskId: task.uuid,
      });

      const found = await repo.findJobByTaskId(task.uuid);
      expect(found).toBeDefined();
      expect(found!.uuid).toBe(job.uuid);
    });

    it("should return undefined when only a failed job exists (allows retry)", async () => {
      const project = await createTestProject(db);
      const worker = await createTestWorker(db);
      const task = await createTestTask(db, { projectId: project.uuid });

      const job = await repo.createJob(worker.uuid, {
        type: "execute_task",
        taskId: task.uuid,
      });
      await repo.updateJobStatus(job.uuid, "failed", "Something broke");

      const found = await repo.findJobByTaskId(task.uuid);
      expect(found).toBeUndefined();
    });

    it("should return undefined when no job exists for task", async () => {
      const found = await repo.findJobByTaskId(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(found).toBeUndefined();
    });
  });

  describe("updateJobStatus", () => {
    it("should update job status", async () => {
      const worker = await createTestWorker(db);
      const job = await repo.createJob(worker.uuid, { type: "execute_task" });

      const updated = await repo.updateJobStatus(job.uuid, "in_progress");
      expect(updated!.status).toBe("in_progress");
      expect(updated!.failReason).toBeNull();
    });

    it("should store failReason when status is failed", async () => {
      const worker = await createTestWorker(db);
      const job = await repo.createJob(worker.uuid, { type: "execute_task" });

      const updated = await repo.updateJobStatus(
        job.uuid,
        "failed",
        "Task execution timed out",
      );
      expect(updated!.status).toBe("failed");
      expect(updated!.failReason).toBe("Task execution timed out");
    });

    it("should return undefined for non-existent job", async () => {
      const result = await repo.updateJobStatus(
        "00000000-0000-0000-0000-000000000000",
        "completed",
      );
      expect(result).toBeUndefined();
    });
  });

  describe("countJobs", () => {
    it("should count jobs for a worker", async () => {
      const worker = await createTestWorker(db);
      await repo.createJob(worker.uuid, { type: "execute_task" });
      await repo.createJob(worker.uuid, { type: "cleanup" });

      expect(await repo.countJobs(worker.uuid)).toBe(2);
    });

    it("should count jobs filtered by status", async () => {
      const worker = await createTestWorker(db);
      const job = await repo.createJob(worker.uuid, { type: "execute_task" });
      await repo.updateJobStatus(job.uuid, "completed");
      await repo.createJob(worker.uuid, { type: "cleanup" });

      expect(await repo.countJobs(worker.uuid, "ready")).toBe(1);
      expect(await repo.countJobs(worker.uuid, "completed")).toBe(1);
    });
  });

  describe("findJobsPaginated", () => {
    it("should return paginated jobs for a worker", async () => {
      const worker = await createTestWorker(db);
      for (let i = 0; i < 4; i++) {
        await repo.createJob(worker.uuid, { type: "execute_task" });
      }

      const page1 = await repo.findJobsPaginated({
        workerId: worker.uuid,
        limit: 2,
        offset: 0,
      });
      expect(page1).toHaveLength(2);

      const page2 = await repo.findJobsPaginated({
        workerId: worker.uuid,
        limit: 2,
        offset: 2,
      });
      expect(page2).toHaveLength(2);
    });

    it("should filter paginated results by status", async () => {
      const worker = await createTestWorker(db);
      const job1 = await repo.createJob(worker.uuid, { type: "execute_task" });
      await repo.updateJobStatus(job1.uuid, "completed");
      await repo.createJob(worker.uuid, { type: "cleanup" });

      const readyJobs = await repo.findJobsPaginated({
        workerId: worker.uuid,
        status: "ready",
        limit: 10,
        offset: 0,
      });
      expect(readyJobs).toHaveLength(1);
    });
  });
});
