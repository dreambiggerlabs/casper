import { randomBytes } from "crypto";

import { eq, sql } from "drizzle-orm";

import {
  NotFoundError,
  ValidationError,
  zodIssuesToViolations,
} from "../shared/errors/index.js";

import type { Database } from "../shared/database/index.js";

import type {
  PaginatedResult,
  PaginationParams,
} from "../shared/pagination/index.js";

import { toIri } from "../shared/iri/index.js";

import { task } from "../task/task.schema.js";
import type { Task } from "../task/task.types.js";

import {
  createWorkerSchema,
  createJobSchema,
  updateJobStatusSchema,
  claimTaskSchema,
  workerJob,
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
    private readonly database: Database,
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
    const parsed = claimTaskSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    const worker = await this.workerRepository.findByUuid(
      parsed.data.workerUuid,
    );
    if (!worker) {
      throw new NotFoundError("Worker", parsed.data.workerUuid);
    }

    return this.database.transaction(async (tx) => {
      // Find and lock an available task (assigned but not yet claimed)
      const rows = await tx.execute<Record<string, unknown>>(
        sql`SELECT * FROM task WHERE status = 'assigned' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`,
      );
      const taskRow = rows[0];
      if (!taskRow) return null;

      const taskUuid = taskRow.uuid as string;

      // Create a job for this worker + task
      const jobRows = await tx
        .insert(workerJob)
        .values({
          workerId: worker.uuid,
          type: "execute_task",
          taskId: taskUuid,
        })
        .returning();
      const jobRow = jobRows[0];
      if (!jobRow) {
        throw new Error("Failed to create job");
      }

      // Transition task to 'processing'
      const taskRows = await tx
        .update(task)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(task.uuid, taskUuid))
        .returning();
      const updatedTaskRow = taskRows[0];
      if (!updatedTaskRow) {
        throw new Error("Failed to update task status");
      }

      const claimedTask: Task = {
        "@id": toIri("tasks", updatedTaskRow.uuid),
        uuid: updatedTaskRow.uuid,
        title: updatedTaskRow.title,
        project: toIri("projects", updatedTaskRow.projectId),
        parent: updatedTaskRow.parentId
          ? toIri("tasks", updatedTaskRow.parentId)
          : null,
        status: updatedTaskRow.status as Task["status"],
        agent: updatedTaskRow.agentId
          ? toIri("agents", updatedTaskRow.agentId)
          : null,
        createdAt: updatedTaskRow.createdAt,
        updatedAt: updatedTaskRow.updatedAt,
      };

      const claimedJob: WorkerJob = {
        "@id": toIri("jobs", jobRow.uuid),
        uuid: jobRow.uuid,
        worker: toIri("workers", jobRow.workerId),
        type: jobRow.type as WorkerJob["type"],
        status: jobRow.status as JobStatus,
        task: jobRow.taskId ? toIri("tasks", jobRow.taskId) : null,
        createdAt: jobRow.createdAt,
        updatedAt: jobRow.updatedAt,
      };

      return { job: claimedJob, task: claimedTask };
    });
  }
}
