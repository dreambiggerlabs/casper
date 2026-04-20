import {
  eq,
  ne,
  and,
  count as drizzleCount,
  sql,
  type SQL,
  type AnyColumn,
} from "drizzle-orm";

import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import { IriBuilder } from "@/shared/domain/iri/iri-builder.js";
import { task } from "@/task/infrastructure/schema/task.schema.js";
import { TaskMapper } from "@/task/infrastructure/mapper/task.mapper.js";
import type { Task } from "@/task/domain/entity/task.entity.js";
import type { WorkerJobRepository } from "@/worker/application/port/worker-job.repository.js";
import type { WorkerJob } from "@/worker/domain/entity/worker-job.entity.js";
import type { JobStatus } from "@/worker/domain/value-object/job-status.value-object.js";
import type { JobType } from "@/worker/domain/value-object/job-type.value-object.js";

import { WorkerJobMapper } from "@/worker/infrastructure/mapper/worker-job.mapper.js";
import { worker, workerJob } from "@/worker/infrastructure/schema/worker.schema.js";

export class DrizzleWorkerJobRepository implements WorkerJobRepository {
  constructor(
    private readonly database: Database,
    private readonly mapper: WorkerJobMapper = new WorkerJobMapper(),
    private readonly taskMapper: TaskMapper = new TaskMapper(),
    private readonly iri: IriBuilder = new IriBuilder(),
  ) {}

  private get jobColumns() {
    return {
      uuid: workerJob.uuid,
      type: workerJob.type,
      status: workerJob.status,
      failReason: workerJob.failReason,
      createdAt: workerJob.createdAt,
      updatedAt: workerJob.updatedAt,
      workerUuid: worker.uuid,
      taskUuid: task.uuid,
    };
  }

  private baseQuery() {
    return this.database
      .select(this.jobColumns)
      .from(workerJob)
      .innerJoin(worker, eq(workerJob.workerId, worker.id))
      .leftJoin(task, eq(workerJob.taskId, task.id));
  }

  private resolveId(table: { id: AnyColumn; uuid: AnyColumn }, uuid: string) {
    return sql<number>`(SELECT ${table.id} FROM ${table} WHERE ${table.uuid} = ${uuid})`;
  }

  async findJobByUuid(uuid: string): Promise<WorkerJob | undefined> {
    const rows = await this.baseQuery().where(eq(workerJob.uuid, uuid));
    const row = rows[0];

    return row ? this.mapper.toEntity(row) : undefined;
  }

  async findJobsByWorkerId(
    workerId: string,
    status?: JobStatus,
  ): Promise<WorkerJob[]> {
    const conditions: SQL[] = [eq(worker.uuid, workerId)];
    if (status) conditions.push(eq(workerJob.status, status));
    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    const rows = await this.baseQuery().where(where);

    return rows.map((row) => this.mapper.toEntity(row));
  }

  async findJobByTaskId(taskId: string): Promise<WorkerJob | undefined> {
    const rows = await this.baseQuery().where(
      and(eq(task.uuid, taskId), ne(workerJob.status, "failed")),
    );
    const row = rows[0];

    return row ? this.mapper.toEntity(row) : undefined;
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

    return rows.map((row) => this.mapper.toEntity(row));
  }

  async createJob(
    workerId: string,
    data: { type: JobType; taskId?: string },
  ): Promise<WorkerJob> {
    const rows = await this.database
      .insert(workerJob)
      .values({
        workerId: this.resolveId(worker, workerId),
        type: data.type,
        taskId: data.taskId ? this.resolveId(task, data.taskId) : undefined,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create job");
    }

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

  async claimAvailableTask(
    workerUuid: string,
  ): Promise<{ job: WorkerJob; task: Task } | null> {
    return this.database.transaction(async (tx) => {
      const taskRows = await tx.execute<Record<string, unknown>>(
        sql`SELECT t.*, p.uuid AS project_uuid, a.uuid AS agent_uuid, pt.uuid AS parent_uuid
            FROM task t
            INNER JOIN project p ON t.project_id = p.id
            LEFT JOIN agent a ON t.assignee_id = a.id AND t.assignee_type = 'agent'
            LEFT JOIN task pt ON t.parent_id = pt.id
            WHERE t.status = 'ready'
              AND t.assignee_type = 'agent'
              AND t.assignee_id IS NOT NULL
            ORDER BY t.created_at ASC LIMIT 1
            FOR UPDATE OF t SKIP LOCKED`,
      );
      const taskRow = taskRows[0];
      if (!taskRow) return null;

      const taskId = taskRow["id"] as number;
      const taskUuid = taskRow["uuid"] as string;

      const workerRows = await tx
        .select({ id: worker.id })
        .from(worker)
        .where(eq(worker.uuid, workerUuid));
      const workerRow = workerRows[0];
      if (!workerRow) {
        throw new Error("Worker not found in transaction");
      }

      const jobRows = await tx
        .insert(workerJob)
        .values({
          workerId: workerRow.id,
          type: "execute_task",
          taskId,
        })
        .returning();
      const jobRow = jobRows[0];
      if (!jobRow) {
        throw new Error("Failed to create job");
      }

      const updatedTaskRows = await tx
        .update(task)
        .set({ status: "in_progress", updatedAt: new Date() })
        .where(eq(task.uuid, taskUuid))
        .returning();
      const updatedTaskRow = updatedTaskRows[0];
      if (!updatedTaskRow) {
        throw new Error("Failed to update task status");
      }

      const claimedTask = this.taskMapper.toEntity({
        uuid: updatedTaskRow.uuid,
        title: updatedTaskRow.title,
        description: updatedTaskRow.description,
        status: updatedTaskRow.status,
        createdAt: updatedTaskRow.createdAt,
        updatedAt: updatedTaskRow.updatedAt,
        projectUuid: taskRow["project_uuid"] as string,
        parentUuid: (taskRow["parent_uuid"] as string | null) ?? null,
        assigneeType: taskRow["agent_uuid"] ? "agent" : null,
        agentUuid: (taskRow["agent_uuid"] as string | null) ?? null,
        userUuid: null,
      });

      const claimedJob: WorkerJob = {
        "@id": this.iri.build("jobs", jobRow.uuid),
        uuid: jobRow.uuid,
        worker: this.iri.build("workers", workerUuid),
        type: jobRow.type,
        status: jobRow.status,
        task: this.iri.build("tasks", taskUuid),
        failReason: jobRow.failReason,
        createdAt: jobRow.createdAt,
        updatedAt: jobRow.updatedAt,
      };

      return { job: claimedJob, task: claimedTask };
    });
  }
}
