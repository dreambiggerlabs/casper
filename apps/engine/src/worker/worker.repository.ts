import {
  eq,
  ne,
  and,
  count as drizzleCount,
  sql,
  type SQL,
  type AnyColumn,
} from "drizzle-orm";

import type { Database } from "../shared/database/index.js";
import { toIri } from "../shared/iri/index.js";

import { task } from "../task/task.schema.js";

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

interface WorkerJobRow {
  id: number;
  uuid: string;
  type: JobType;
  status: JobStatus;
  failReason: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  workerUuid: string;
  taskUuid: string | null;
}

function toWorkerJob(row: WorkerJobRow): WorkerJob {
  return {
    "@id": toIri("jobs", row.uuid),
    uuid: row.uuid,
    worker: toIri("workers", row.workerUuid),
    type: row.type,
    status: row.status,
    task: row.taskUuid ? toIri("tasks", row.taskUuid) : null,
    failReason: row.failReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Resolve a UUID to an integer ID via subquery. */
function resolveId(table: { id: AnyColumn; uuid: AnyColumn }, uuid: string) {
  return sql<number>`(SELECT ${table.id} FROM ${table} WHERE ${table.uuid} = ${uuid})`;
}

const jobColumns = {
  id: workerJob.id,
  uuid: workerJob.uuid,
  type: workerJob.type,
  status: workerJob.status,
  failReason: workerJob.failReason,
  createdAt: workerJob.createdAt,
  updatedAt: workerJob.updatedAt,
  workerUuid: worker.uuid,
  taskUuid: task.uuid,
};

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

  private baseQuery() {
    return this.database
      .select(jobColumns)
      .from(workerJob)
      .innerJoin(worker, eq(workerJob.workerId, worker.id))
      .leftJoin(task, eq(workerJob.taskId, task.id));
  }

  async findJobByUuid(uuid: string): Promise<WorkerJob | undefined> {
    const rows = await this.baseQuery().where(eq(workerJob.uuid, uuid));
    const row = rows[0];

    return row ? toWorkerJob(row) : undefined;
  }

  async findJobsByWorkerId(
    workerId: string,
    status?: JobStatus,
  ): Promise<WorkerJob[]> {
    const conditions: SQL[] = [eq(worker.uuid, workerId)];
    if (status) conditions.push(eq(workerJob.status, status));
    const query = conditions.length === 1 ? conditions[0] : and(...conditions);
    const rows = await this.baseQuery().where(query);

    return rows.map(toWorkerJob);
  }

  async findJobByTaskId(taskId: string): Promise<WorkerJob | undefined> {
    const rows = await this.baseQuery().where(
      and(eq(task.uuid, taskId), ne(workerJob.status, "failed")),
    );
    const row = rows[0];

    return row ? toWorkerJob(row) : undefined;
  }

  async countJobs(workerId: string, status?: JobStatus): Promise<number> {
    const conditions: SQL[] = [eq(worker.uuid, workerId)];
    if (status) conditions.push(eq(workerJob.status, status));
    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    const rows = await this.database
      .select({ count: drizzleCount() })
      .from(workerJob)
      .innerJoin(worker, eq(workerJob.workerId, worker.id))
      .where(where);

    return rows[0]?.count ?? 0;
  }

  async findJobsPaginated(params: {
    workerId: string;
    status?: JobStatus;
    limit: number;
    offset: number;
  }): Promise<WorkerJob[]> {
    const conditions: SQL[] = [eq(worker.uuid, params.workerId)];
    if (params.status) conditions.push(eq(workerJob.status, params.status));
    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    const rows = await this.baseQuery()
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
      .values({
        workerId: resolveId(worker, workerId),
        type: data.type,
        taskId: data.taskId ? resolveId(task, data.taskId) : undefined,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create job");
    }

    // Re-fetch with JOINs to get related UUIDs
    const created = await this.findJobByUuid(row.uuid);
    if (!created) {
      throw new Error("Failed to fetch created job");
    }

    return created;
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
    if (!row) return undefined;

    return this.findJobByUuid(row.uuid);
  }
}
