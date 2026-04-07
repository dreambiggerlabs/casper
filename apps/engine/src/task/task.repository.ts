import { eq, and, count as drizzleCount, type SQL } from "drizzle-orm";

import type { Database } from "../shared/database/index.js";
import { toIri } from "../shared/iri/index.js";

import { task } from "./task.schema.js";
import type { TaskStatus } from "./task.schema.js";
import type {
  CreateTask,
  Task,
  TaskRepository,
  UpdateTask,
} from "./task.types.js";

function toTask(row: typeof task.$inferSelect): Task {
  return {
    "@id": toIri("tasks", row.uuid),
    uuid: row.uuid,
    title: row.title,
    project: toIri("projects", row.projectId),
    parent: row.parentId ? toIri("tasks", row.parentId) : null,
    status: row.status,
    agent: row.agentId ? toIri("agents", row.agentId) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleTaskRepository implements TaskRepository {
  constructor(private readonly database: Database) {}

  async findByUuid(uuid: string): Promise<Task | undefined> {
    const rows = await this.database
      .select()
      .from(task)
      .where(eq(task.uuid, uuid));
    const row = rows[0];

    return row ? toTask(row) : undefined;
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    const rows = await this.database
      .select()
      .from(task)
      .where(eq(task.projectId, projectId));

    return rows.map(toTask);
  }

  async findByStatusAndAgentId(
    status: TaskStatus,
    agentId: string,
  ): Promise<Task[]> {
    const rows = await this.database
      .select()
      .from(task)
      .where(and(eq(task.status, status), eq(task.agentId, agentId)));

    return rows.map(toTask);
  }

  async findAll(): Promise<Task[]> {
    const rows = await this.database.select().from(task);

    return rows.map(toTask);
  }

  private buildFilters(filters?: {
    status?: TaskStatus;
    agentId?: string;
    projectId?: string;
  }): SQL | undefined {
    const conditions: SQL[] = [];
    if (filters?.status) conditions.push(eq(task.status, filters.status));
    if (filters?.agentId) conditions.push(eq(task.agentId, filters.agentId));
    if (filters?.projectId)
      conditions.push(eq(task.projectId, filters.projectId));
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];

    return and(...conditions);
  }

  async count(filters?: {
    status?: TaskStatus;
    agentId?: string;
    projectId?: string;
  }): Promise<number> {
    const where = this.buildFilters(filters);
    const query = this.database.select({ count: drizzleCount() }).from(task);
    const rows = where ? await query.where(where) : await query;

    return rows[0]?.count ?? 0;
  }

  async findPaginated(params: {
    limit: number;
    offset: number;
    status?: TaskStatus;
    agentId?: string;
    projectId?: string;
  }): Promise<Task[]> {
    const where = this.buildFilters(params);
    const query = this.database.select().from(task);
    const filtered = where ? query.where(where) : query;
    const rows = await filtered.limit(params.limit).offset(params.offset);

    return rows.map(toTask);
  }

  async create(data: CreateTask): Promise<Task> {
    const rows = await this.database.insert(task).values(data).returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create task");
    }

    return toTask(row);
  }

  async update(uuid: string, data: UpdateTask): Promise<Task | undefined> {
    const rows = await this.database
      .update(task)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(task.uuid, uuid))
      .returning();
    const row = rows[0];

    return row ? toTask(row) : undefined;
  }

  async assign(uuid: string, agentId: string): Promise<Task | undefined> {
    const rows = await this.database
      .update(task)
      .set({ agentId, updatedAt: new Date() })
      .where(eq(task.uuid, uuid))
      .returning();
    const row = rows[0];

    return row ? toTask(row) : undefined;
  }

  async updateStatus(
    uuid: string,
    status: TaskStatus,
  ): Promise<Task | undefined> {
    const rows = await this.database
      .update(task)
      .set({ status, updatedAt: new Date() })
      .where(eq(task.uuid, uuid))
      .returning();
    const row = rows[0];

    return row ? toTask(row) : undefined;
  }
}
