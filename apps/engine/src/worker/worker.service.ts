import { randomBytes } from "crypto";

import {
  NotFoundError,
  ValidationError,
  zodIssuesToViolations,
} from "../shared/errors/index.js";

import {
  createWorkerSchema,
  createJobSchema,
  updateJobStatusSchema,
} from "./worker.schema.js";
import type {
  Worker,
  WorkerJob,
  WorkerRepository,
  WorkerJobRepository,
  JobStatus,
} from "./worker.types.js";

export class WorkerService {
  constructor(
    private readonly workerRepository: WorkerRepository,
    private readonly workerJobRepository: WorkerJobRepository,
  ) {}

  async registerWorker(input: unknown): Promise<Worker> {
    const parsed = createWorkerSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    const token = this.generateToken();
    const name = parsed.data.name ?? `worker-${Date.now()}`;

    return this.workerRepository.create({ name, token });
  }

  private generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  async heartbeat(uuid: string, _input: unknown): Promise<Worker> {
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

  async listWorkers(): Promise<Worker[]> {
    return this.workerRepository.findAll();
  }

  async createJob(workerId: string, input: unknown): Promise<WorkerJob> {
    const parsed = createJobSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    // Check if task already has a job
    if (parsed.data.taskId) {
      const existingJob = await this.workerJobRepository.findJobByTaskId(
        parsed.data.taskId,
      );
      if (existingJob) {
        throw new ValidationError("Task already has a job", [
          { field: "taskId", message: "A job already exists for this task" },
        ]);
      }
    }

    return this.workerJobRepository.createJob(workerId, parsed.data);
  }

  async updateJobStatus(
    uuid: string,
    input: unknown,
  ): Promise<WorkerJob> {
    const parsed = updateJobStatusSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    const job = await this.workerJobRepository.findJobByUuid(uuid);
    if (!job) {
      throw new NotFoundError("Job", uuid);
    }

    const updated = await this.workerJobRepository.updateJobStatus(
      uuid,
      parsed.data.status,
    );
    if (!updated) {
      throw new NotFoundError("Job", uuid);
    }
    return updated;
  }

  async listJobs(
    workerId: string,
    status?: JobStatus,
  ): Promise<WorkerJob[]> {
    return this.workerJobRepository.findJobsByWorkerId(workerId, status);
  }

  async getJob(uuid: string): Promise<WorkerJob> {
    const job = await this.workerJobRepository.findJobByUuid(uuid);
    if (!job) {
      throw new NotFoundError("Job", uuid);
    }
    return job;
  }
}