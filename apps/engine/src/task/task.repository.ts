import { eq, and } from "drizzle-orm";

import type { Database } from "../shared/database/index.js";

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
    uuid: row.uuid,
    title: row.title,
    projectId: row.projectId,
    parentId: row.parentId,
    status: row.status as TaskStatus,
    agentId: row.agentId,
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
      .set({ agentId, status: "assigned", updatedAt: new Date() })
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
