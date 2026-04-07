import { eq, ne, and, count as drizzleCount } from "drizzle-orm";

import type { Database } from "../shared/database/index.js";
import { toIri } from "../shared/iri/index.js";

import { worker, workerJob } from "./worker.schema.js";
import type {
  Worker,
  WorkerJob,
  WorkerRepository,
  WorkerJobRepository,
  WorkerStatus,
  JobType,
  JobStatus,
} from "./worker.types.js";

function toWorker(row: typeof worker.$inferSelect): Worker {
  return {
    "@id": toIri("workers", row.uuid),
    uuid: row.uuid,
    name: row.name,
    token: row.token,
    status: row.status,
    lastHeartbeatAt: row.lastHeartbeatAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toWorkerJob(row: typeof workerJob.$inferSelect): WorkerJob {
  return {
    "@id": toIri("jobs", row.uuid),
    uuid: row.uuid,
    worker: toIri("workers", row.workerId),
    type: row.type,
    status: row.status,
    task: row.taskId ? toIri("tasks", row.taskId) : null,
    failReason: row.failReason,
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

  async count(): Promise<number> {
    const rows = await this.database
      .select({ count: drizzleCount() })
      .from(worker);

    return rows[0]?.count ?? 0;
  }

  async findPaginated(params: {
    limit: number;
    offset: number;
  }): Promise<Worker[]> {
    const rows = await this.database
      .select()
      .from(worker)
      .limit(params.limit)
      .offset(params.offset);

    return rows.map(toWorker);
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
    const rows = await this.database.select().from(workerJob).where(query);

    return rows.map(toWorkerJob);
  }

  async findJobByTaskId(taskId: string): Promise<WorkerJob | undefined> {
    const rows = await this.database
      .select()
      .from(workerJob)
      .where(and(eq(workerJob.taskId, taskId), ne(workerJob.status, "failed")));
    const row = rows[0];

    return row ? toWorkerJob(row) : undefined;
  }

  async countJobs(workerId: string, status?: JobStatus): Promise<number> {
    const where = status
      ? and(eq(workerJob.workerId, workerId), eq(workerJob.status, status))
      : eq(workerJob.workerId, workerId);
    const rows = await this.database
      .select({ count: drizzleCount() })
      .from(workerJob)
      .where(where);

    return rows[0]?.count ?? 0;
  }

  async findJobsPaginated(params: {
    workerId: string;
    status?: JobStatus;
    limit: number;
    offset: number;
  }): Promise<WorkerJob[]> {
    const where = params.status
      ? and(
          eq(workerJob.workerId, params.workerId),
          eq(workerJob.status, params.status),
        )
      : eq(workerJob.workerId, params.workerId);
    const rows = await this.database
      .select()
      .from(workerJob)
      .where(where)
      .limit(params.limit)
      .offset(params.offset);

    return rows.map(toWorkerJob);
  }

  async createJob(
    workerId: string,
    data: { type: JobType; taskId?: string },
  ): Promise<WorkerJob> {
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
    failReason?: string,
  ): Promise<WorkerJob | undefined> {
    const rows = await this.database
      .update(workerJob)
      .set({ status, failReason: failReason ?? null, updatedAt: new Date() })
      .where(eq(workerJob.uuid, uuid))
      .returning();
    const row = rows[0];

    return row ? toWorkerJob(row) : undefined;
  }
}
