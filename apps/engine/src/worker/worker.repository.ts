import { eq, and } from "drizzle-orm";

import type { Database } from "../shared/database/index.js";

import { worker, workerJob } from "./worker.schema.js";
import type {
  CreateJob,
  Worker,
  WorkerJob,
  WorkerRepository,
  WorkerJobRepository,
  WorkerStatus,
  JobStatus,
} from "./worker.types.js";

function toWorker(row: typeof worker.$inferSelect): Worker {
  return {
    uuid: row.uuid,
    name: row.name,
    token: row.token,
    status: row.status as WorkerStatus,
    lastHeartbeatAt: row.lastHeartbeatAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toWorkerJob(row: typeof workerJob.$inferSelect): WorkerJob {
  return {
    uuid: row.uuid,
    workerId: row.workerId,
    type: row.type as WorkerJob["type"],
    status: row.status as JobStatus,
    taskId: row.taskId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleWorkerRepository implements WorkerRepository {
  constructor(private readonly database: Database) {}

  async findByUuid(uuid: string): Promise<Worker | undefined> {
    const rows = await this.database
      .select()
      .from(worker)
      .where(eq(worker.uuid, uuid));
    const row = rows[0];
    return row ? toWorker(row) : undefined;
  }

  async findByToken(token: string): Promise<Worker | undefined> {
    const rows = await this.database
      .select()
      .from(worker)
      .where(eq(worker.token, token));
    const row = rows[0];
    return row ? toWorker(row) : undefined;
  }

  async findAll(): Promise<Worker[]> {
    const rows = await this.database.select().from(worker);
    return rows.map(toWorker);
  }

  async findActive(): Promise<Worker[]> {
    const rows = await this.database
      .select()
      .from(worker)
      .where(eq(worker.status, "active"));
    return rows.map(toWorker);
  }

  async create(data: { name: string; token: string }): Promise<Worker> {
    const rows = await this.database.insert(worker).values(data).returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create worker");
    }
    return toWorker(row);
  }

  async updateHeartbeat(
    uuid: string,
    status?: WorkerStatus,
  ): Promise<Worker | undefined> {
    const rows = await this.database
      .update(worker)
      .set({
        status: status ?? "active",
        lastHeartbeatAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(worker.uuid, uuid))
      .returning();
    const row = rows[0];
    return row ? toWorker(row) : undefined;
  }
}

export class DrizzleWorkerJobRepository implements WorkerJobRepository {
  constructor(private readonly database: Database) {}

  async findJobByUuid(uuid: string): Promise<WorkerJob | undefined> {
    const rows = await this.database
      .select()
      .from(workerJob)
      .where(eq(workerJob.uuid, uuid));
    const row = rows[0];
    return row ? toWorkerJob(row) : undefined;
  }

  async findJobsByWorkerId(
    workerId: string,
    status?: JobStatus,
  ): Promise<WorkerJob[]> {
    const query = status
      ? and(eq(workerJob.workerId, workerId), eq(workerJob.status, status))
      : eq(workerJob.workerId, workerId);
    const rows = await this.database
      .select()
      .from(workerJob)
      .where(query);
    return rows.map(toWorkerJob);
  }

  async findJobByTaskId(taskId: string): Promise<WorkerJob | undefined> {
    const rows = await this.database
      .select()
      .from(workerJob)
      .where(eq(workerJob.taskId, taskId));
    const row = rows[0];
    return row ? toWorkerJob(row) : undefined;
  }

  async createJob(workerId: string, data: CreateJob): Promise<WorkerJob> {
    const rows = await this.database
      .insert(workerJob)
      .values({ workerId, ...data })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create job");
    }
    return toWorkerJob(row);
  }

  async updateJobStatus(
    uuid: string,
    status: JobStatus,
  ): Promise<WorkerJob | undefined> {
    const rows = await this.database
      .update(workerJob)
      .set({ status, updatedAt: new Date() })
      .where(eq(workerJob.uuid, uuid))
      .returning();
    const row = rows[0];
    return row ? toWorkerJob(row) : undefined;
  }
}