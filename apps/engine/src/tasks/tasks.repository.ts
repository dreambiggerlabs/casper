import { eq } from "drizzle-orm";

import type { Database } from "../shared/database/index.js";

import { tasks } from "./tasks.schema.js";
import type {
  CreateTask,
  Task,
  TaskRepository,
  UpdateTask,
} from "./tasks.types.js";

function toTask(row: typeof tasks.$inferSelect): Task {
  return {
    uuid: row.uuid,
    title: row.title,
    projectId: row.projectId,
    parentId: row.parentId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleTaskRepository implements TaskRepository {
  constructor(private readonly database: Database) {}

  async findByUuid(uuid: string): Promise<Task | undefined> {
    const rows = await this.database
      .select()
      .from(tasks)
      .where(eq(tasks.uuid, uuid));
    const row = rows[0];
    return row ? toTask(row) : undefined;
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    const rows = await this.database
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));
    return rows.map(toTask);
  }

  async findAll(): Promise<Task[]> {
    const rows = await this.database.select().from(tasks);
    return rows.map(toTask);
  }

  async create(data: CreateTask): Promise<Task> {
    const rows = await this.database.insert(tasks).values(data).returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create task");
    }
    return toTask(row);
  }

  async update(uuid: string, data: UpdateTask): Promise<Task | undefined> {
    const rows = await this.database
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.uuid, uuid))
      .returning();
    const row = rows[0];
    return row ? toTask(row) : undefined;
  }
}
