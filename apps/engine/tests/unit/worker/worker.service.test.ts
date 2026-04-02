import { describe, it, expect, vi } from "vitest";

import { NotFoundError, ValidationError } from "../../../src/shared/errors/index.js";

import { WorkerService } from "../../../src/worker/worker.service.js";
import type { WorkerRepository, WorkerJobRepository, Worker, WorkerJob } from "../../../src/worker/worker.types.js";

function createMockWorkerRepository(): WorkerRepository {
  return {
    findByUuid: vi.fn(),
    findByToken: vi.fn(),
    findAll: vi.fn(),
    findActive: vi.fn(),
    create: vi.fn(),
    updateHeartbeat: vi.fn(),
  };
}

function createMockWorkerJobRepository(): WorkerJobRepository {
  return {
    findJobByUuid: vi.fn(),
    findJobsByWorkerId: vi.fn(),
    findJobByTaskId: vi.fn(),
    createJob: vi.fn(),
    updateJobStatus: vi.fn(),
  };
}

function makeWorker(overrides: Partial<Worker> = {}): Worker {
  return {
    uuid: "550e8400-e29b-41d4-a716-446655440003",
    name: "Test Worker",
    token: "test-token-123",
    status: "active",
    lastHeartbeatAt: new Date("2026-01-01"),
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeWorkerJob(overrides: Partial<WorkerJob> = {}): WorkerJob {
  return {
    uuid: "550e8400-e29b-41d4-a716-446655440010",
    workerId: "550e8400-e29b-41d4-a716-446655440003",
    type: "execute_task",
    status: "pending",
    taskId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("WorkerService", () => {
  describe("registerWorker", () => {
    it("should register a worker when valid data is provided", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const expectedWorker = makeWorker({ name: "Worker 1" });

      vi.mocked(workerRepository.create).mockResolvedValue(expectedWorker);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.registerWorker({ name: "Worker 1" });

      expect(result).toEqual(expectedWorker);
      expect(workerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Worker 1", token: expect.any(String) }),
      );
    });

    it("should register a worker with auto-generated name when name is not provided", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const expectedWorker = makeWorker({ name: "worker-123" });

      vi.mocked(workerRepository.create).mockResolvedValue(expectedWorker);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.registerWorker({});

      expect(result).toEqual(expectedWorker);
      expect(workerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.any(String), token: expect.any(String) }),
      );
    });

    it("should throw ValidationError when name is empty string", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const service = new WorkerService(workerRepository, workerJobRepository);

      await expect(service.registerWorker({ name: "" })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("heartbeat", () => {
    it("should update worker heartbeat", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const worker = makeWorker();
      vi.mocked(workerRepository.findByUuid).mockResolvedValue(worker);
      vi.mocked(workerRepository.updateHeartbeat).mockResolvedValue(worker);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.heartbeat(worker.uuid, {});

      expect(result).toEqual(worker);
      expect(workerRepository.updateHeartbeat).toHaveBeenCalledWith(worker.uuid);
    });

    it("should throw NotFoundError when worker does not exist", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      vi.mocked(workerRepository.findByUuid).mockResolvedValue(undefined);

      const service = new WorkerService(workerRepository, workerJobRepository);

      await expect(service.heartbeat("nonexistent", {})).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("getWorker", () => {
    it("should return a worker when it exists", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const expected = makeWorker();
      vi.mocked(workerRepository.findByUuid).mockResolvedValue(expected);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.getWorker(expected.uuid);

      expect(result).toEqual(expected);
    });

    it("should throw NotFoundError when worker does not exist", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      vi.mocked(workerRepository.findByUuid).mockResolvedValue(undefined);

      const service = new WorkerService(workerRepository, workerJobRepository);

      await expect(service.getWorker("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("listWorkers", () => {
    it("should return all workers", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const expected = [makeWorker(), makeWorker({ uuid: "other-uuid" })];
      vi.mocked(workerRepository.findAll).mockResolvedValue(expected);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.listWorkers();

      expect(result).toEqual(expected);
    });
  });

  describe("createJob", () => {
    it("should create a job when valid data is provided", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const workerId = "550e8400-e29b-41d4-a716-446655440003";
      const expectedJob = makeWorkerJob({ workerId });

      vi.mocked(workerJobRepository.createJob).mockResolvedValue(expectedJob);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.createJob(workerId, { type: "execute_task" });

      expect(result).toEqual(expectedJob);
      expect(workerJobRepository.createJob).toHaveBeenCalledWith(workerId, {
        type: "execute_task",
      });
    });

    it("should throw ValidationError when type is invalid", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const service = new WorkerService(workerRepository, workerJobRepository);

      await expect(
        service.createJob("worker-uuid", { type: "invalid_type" }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when task already has a job", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const workerId = "550e8400-e29b-41d4-a716-446655440003";
      const taskId = "550e8400-e29b-41d4-a716-446655440001";

      vi.mocked(workerJobRepository.findJobByTaskId).mockResolvedValue(
        makeWorkerJob({ taskId }),
      );

      const service = new WorkerService(workerRepository, workerJobRepository);

      await expect(
        service.createJob(workerId, { type: "execute_task", taskId }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("updateJobStatus", () => {
    it("should update job status", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const job = makeWorkerJob({ status: "pending" });
      const updatedJob = makeWorkerJob({ status: "in_progress" });

      vi.mocked(workerJobRepository.findJobByUuid).mockResolvedValue(job);
      vi.mocked(workerJobRepository.updateJobStatus).mockResolvedValue(updatedJob);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.updateJobStatus(job.uuid, { status: "in_progress" });

      expect(result).toEqual(updatedJob);
      expect(workerJobRepository.updateJobStatus).toHaveBeenCalledWith(
        job.uuid,
        "in_progress",
      );
    });

    it("should throw NotFoundError when job does not exist", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      vi.mocked(workerJobRepository.findJobByUuid).mockResolvedValue(undefined);

      const service = new WorkerService(workerRepository, workerJobRepository);

      await expect(
        service.updateJobStatus("nonexistent", { status: "completed" }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("listJobs", () => {
    it("should return jobs for a worker", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const workerId = "550e8400-e29b-41d4-a716-446655440003";
      const expected = [makeWorkerJob({ workerId })];

      vi.mocked(workerJobRepository.findJobsByWorkerId).mockResolvedValue(expected);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.listJobs(workerId);

      expect(result).toEqual(expected);
      expect(workerJobRepository.findJobsByWorkerId).toHaveBeenCalledWith(
        workerId,
        undefined,
      );
    });

    it("should return jobs filtered by status", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const workerId = "550e8400-e29b-41d4-a716-446655440003";
      const expected = [makeWorkerJob({ workerId, status: "pending" })];

      vi.mocked(workerJobRepository.findJobsByWorkerId).mockResolvedValue(expected);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.listJobs(workerId, "pending");

      expect(result).toEqual(expected);
      expect(workerJobRepository.findJobsByWorkerId).toHaveBeenCalledWith(
        workerId,
        "pending",
      );
    });
  });

  describe("getJob", () => {
    it("should return a job when it exists", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const expected = makeWorkerJob();
      vi.mocked(workerJobRepository.findJobByUuid).mockResolvedValue(expected);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.getJob(expected.uuid);

      expect(result).toEqual(expected);
    });

    it("should throw NotFoundError when job does not exist", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      vi.mocked(workerJobRepository.findJobByUuid).mockResolvedValue(undefined);

      const service = new WorkerService(workerRepository, workerJobRepository);

      await expect(service.getJob("nonexistent")).rejects.toThrow(NotFoundError);
    });
  });
});