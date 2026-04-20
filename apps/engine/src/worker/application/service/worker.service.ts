import { randomBytes } from "crypto";

import { NotFoundError } from "@/shared/domain/error/not-found.error.js";
import { ValidationError } from "@/shared/domain/error/validation.error.js";
import type {
  PaginatedResult,
  PaginationParams,
} from "@/shared/domain/value-object/pagination.value-object.js";
import type { Task } from "@/task/domain/entity/task.entity.js";
import type { WorkerJobRepository } from "@/worker/application/port/worker-job.repository.js";
import type { WorkerRepository } from "@/worker/application/port/worker.repository.js";

import type { Worker } from "@/worker/domain/entity/worker.entity.js";
import type { WorkerJob } from "@/worker/domain/entity/worker-job.entity.js";
import type { JobStatus } from "@/worker/domain/value-object/job-status.value-object.js";

import { WorkerDto } from "@/worker/application/dto/worker.dto.js";

export class WorkerService {
  constructor(
    private readonly workerRepository: WorkerRepository,
    private readonly workerJobRepository: WorkerJobRepository,
  ) {}

  async registerWorker(input: unknown): Promise<Worker> {
    const parsed = WorkerDto.register.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
    }

    const token = randomBytes(32).toString("hex");
    const name = parsed.data.name ?? `worker-${Date.now()}`;

    return this.workerRepository.create({ name, token });
  }

  async heartbeat(uuid: string): Promise<Worker> {
    const worker = await this.workerRepository.findByUuid(uuid);
    if (!worker) {
      throw new NotFoundError("Worker", uuid);
    }

    const updated = await this.workerRepository.updateHeartbeat(uuid);
    if (!updated) {
      throw new NotFoundError("Worker", uuid);
    }

    return updated;
  }

  async getWorker(uuid: string): Promise<Worker> {
    const worker = await this.workerRepository.findByUuid(uuid);
    if (!worker) {
      throw new NotFoundError("Worker", uuid);
    }

    return worker;
  }

  async getWorkerByToken(token: string): Promise<Worker> {
    const worker = await this.workerRepository.findByToken(token);
    if (!worker) {
      throw new NotFoundError("Worker", "invalid token");
    }

    return worker;
  }

  async listWorkers(
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Worker>> {
    const offset = (pagination.page - 1) * pagination.itemsPerPage;
    const [items, totalItems] = await Promise.all([
      this.workerRepository.findPaginated({
        limit: pagination.itemsPerPage,
        offset,
      }),
      this.workerRepository.count(),
    ]);

    return { items, totalItems };
  }

  async createJob(input: unknown): Promise<WorkerJob> {
    const parsed = WorkerDto.createJob.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
    }

    if (parsed.data.taskId) {
      const existingJob = await this.workerJobRepository.findJobByTaskId(
        parsed.data.taskId,
      );
      if (existingJob) {
        throw new ValidationError("Task already has a job", [
          { field: "task", message: "A job already exists for this task" },
        ]);
      }
    }

    return this.workerJobRepository.createJob(parsed.data.workerId, {
      type: parsed.data.type,
      taskId: parsed.data.taskId,
    });
  }

  async updateJobStatus(uuid: string, input: unknown): Promise<WorkerJob> {
    const parsed = WorkerDto.updateJobStatus.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
    }

    const job = await this.workerJobRepository.findJobByUuid(uuid);
    if (!job) {
      throw new NotFoundError("Job", uuid);
    }

    const updated = await this.workerJobRepository.updateJobStatus(
      uuid,
      parsed.data.status,
      parsed.data.failReason,
    );
    if (!updated) {
      throw new NotFoundError("Job", uuid);
    }

    return updated;
  }

  async listJobs(
    workerId: string,
    status: JobStatus | undefined,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<WorkerJob>> {
    const offset = (pagination.page - 1) * pagination.itemsPerPage;
    const [items, totalItems] = await Promise.all([
      this.workerJobRepository.findJobsPaginated({
        workerId,
        status,
        limit: pagination.itemsPerPage,
        offset,
      }),
      this.workerJobRepository.countJobs(workerId, status),
    ]);

    return { items, totalItems };
  }

  async getJob(uuid: string): Promise<WorkerJob> {
    const job = await this.workerJobRepository.findJobByUuid(uuid);
    if (!job) {
      throw new NotFoundError("Job", uuid);
    }

    return job;
  }

  async claimTask(
    input: unknown,
  ): Promise<{ job: WorkerJob; task: Task } | null> {
    const parsed = WorkerDto.claimTask.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
    }

    const worker = await this.workerRepository.findByUuid(
      parsed.data.workerUuid,
    );
    if (!worker) {
      throw new NotFoundError("Worker", parsed.data.workerUuid);
    }

    return this.workerJobRepository.claimAvailableTask(worker.uuid);
  }
}
