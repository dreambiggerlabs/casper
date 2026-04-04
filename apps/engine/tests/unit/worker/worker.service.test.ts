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
    count: vi.fn(),
    findPaginated: vi.fn(),
    create: vi.fn(),
    updateHeartbeat: vi.fn(),
  };
}

function createMockWorkerJobRepository(): WorkerJobRepository {
  return {
    findJobByUuid: vi.fn(),
    findJobsByWorkerId: vi.fn(),
    findJobByTaskId: vi.fn(),
    countJobs: vi.fn(),
    findJobsPaginated: vi.fn(),
    createJob: vi.fn(),
    updateJobStatus: vi.fn(),
  };
}

const WORKER_UUID = "550e8400-e29b-41d4-a716-446655440003";
const TASK_UUID = "550e8400-e29b-41d4-a716-446655440001";
const JOB_UUID = "550e8400-e29b-41d4-a716-446655440010";

function makeWorker(overrides: Partial<Worker> = {}): Worker {
  const uuid = overrides.uuid ?? WORKER_UUID;
  return {
    "@id": `/workers/${uuid}`,
    uuid,
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
  const uuid = overrides.uuid ?? JOB_UUID;
  return {
    "@id": `/jobs/${uuid}`,
    uuid,
    worker: `/workers/${WORKER_UUID}`,
    type: "execute_task",
    status: "pending",
    task: null,
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
      const result = await service.heartbeat(worker.uuid);

      expect(result).toEqual(worker);
      expect(workerRepository.updateHeartbeat).toHaveBeenCalledWith(worker.uuid);
    });

    it("should throw NotFoundError when worker does not exist", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      vi.mocked(workerRepository.findByUuid).mockResolvedValue(undefined);

      const service = new WorkerService(workerRepository, workerJobRepository);

      await expect(service.heartbeat("nonexistent")).rejects.toThrow(
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
    it("should return paginated workers", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const workers = [makeWorker(), makeWorker({ uuid: "other-uuid" })];
      vi.mocked(workerRepository.findPaginated).mockResolvedValue(workers);
      vi.mocked(workerRepository.count).mockResolvedValue(2);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.listWorkers({ page: 1, itemsPerPage: 30 });

      expect(result).toEqual({ items: workers, totalItems: 2 });
      expect(workerRepository.findPaginated).toHaveBeenCalledWith({
        limit: 30,
        offset: 0,
      });
    });
  });

  describe("createJob", () => {
    it("should create a job when valid data is provided", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const expectedJob = makeWorkerJob({ worker: `/workers/${WORKER_UUID}` });

      vi.mocked(workerJobRepository.createJob).mockResolvedValue(expectedJob);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.createJob({
        worker: `/workers/${WORKER_UUID}`,
        type: "execute_task",
      });

      expect(result).toEqual(expectedJob);
      expect(workerJobRepository.createJob).toHaveBeenCalledWith(WORKER_UUID, {
        type: "execute_task",
      });
    });

    it("should throw ValidationError when type is invalid", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const service = new WorkerService(workerRepository, workerJobRepository);

      await expect(
        service.createJob({
          worker: `/workers/${WORKER_UUID}`,
          type: "invalid_type",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when task already has a job", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();

      vi.mocked(workerJobRepository.findJobByTaskId).mockResolvedValue(
        makeWorkerJob({ task: `/tasks/${TASK_UUID}` }),
      );

      const service = new WorkerService(workerRepository, workerJobRepository);

      await expect(
        service.createJob({
          worker: `/workers/${WORKER_UUID}`,
          type: "execute_task",
          task: `/tasks/${TASK_UUID}`,
        }),
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
    const pagination = { page: 1, itemsPerPage: 30 };

    it("should return paginated jobs for a worker", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const jobs = [makeWorkerJob({ worker: `/workers/${WORKER_UUID}` })];

      vi.mocked(workerJobRepository.findJobsPaginated).mockResolvedValue(jobs);
      vi.mocked(workerJobRepository.countJobs).mockResolvedValue(1);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.listJobs(WORKER_UUID, undefined, pagination);

      expect(result).toEqual({ items: jobs, totalItems: 1 });
      expect(workerJobRepository.findJobsPaginated).toHaveBeenCalledWith({
        workerId: WORKER_UUID,
        status: undefined,
        limit: 30,
        offset: 0,
      });
    });

    it("should return paginated jobs filtered by status", async () => {
      const workerRepository = createMockWorkerRepository();
      const workerJobRepository = createMockWorkerJobRepository();
      const jobs = [makeWorkerJob({ worker: `/workers/${WORKER_UUID}`, status: "pending" })];

      vi.mocked(workerJobRepository.findJobsPaginated).mockResolvedValue(jobs);
      vi.mocked(workerJobRepository.countJobs).mockResolvedValue(1);

      const service = new WorkerService(workerRepository, workerJobRepository);
      const result = await service.listJobs(WORKER_UUID, "pending", pagination);

      expect(result).toEqual({ items: jobs, totalItems: 1 });
      expect(workerJobRepository.findJobsPaginated).toHaveBeenCalledWith({
        workerId: WORKER_UUID,
        status: "pending",
        limit: 30,
        offset: 0,
      });
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
