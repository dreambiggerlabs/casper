import {
  eq,
  and,
  count as drizzleCount,
  sql,
  type SQL,
  type AnyColumn,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Database } from "../shared/database/index.js";
import { toIri } from "../shared/iri/index.js";

import { project } from "../project/project.schema.js";
import { agent } from "../agent/agent.schema.js";
import { user } from "../user/user.schema.js";

import { task } from "./task.schema.js";
import type { TaskStatus } from "./task.schema.js";
import type {
  AssigneeRef,
  CreateTask,
  Task,
  TaskRepository,
  UpdateTask,
} from "./task.types.js";

const parentTask = alias(task, "parent_task");

interface TaskRow {
  id: number;
  uuid: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date | null;
  projectUuid: string;
  parentUuid: string | null;
  assigneeType: "agent" | "user" | null;
  agentUuid: string | null;
  userUuid: string | null;
}

function toTask(row: TaskRow): Task {
  let assignee: string | null = null;
  if (row.assigneeType === "agent" && row.agentUuid) {
    assignee = toIri("agents", row.agentUuid);
  } else if (row.assigneeType === "user" && row.userUuid) {
    assignee = toIri("users", row.userUuid);
  }

  return {
    "@id": toIri("tasks", row.uuid),
    uuid: row.uuid,
    title: row.title,
    description: row.description,
    project: toIri("projects", row.projectUuid),
    parent: row.parentUuid ? toIri("tasks", row.parentUuid) : null,
    status: row.status,
    assignee,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Resolve a UUID to an integer ID via subquery. */
function resolveId(table: { id: AnyColumn; uuid: AnyColumn }, uuid: string) {
  return sql<number>`(SELECT ${table.id} FROM ${table} WHERE ${table.uuid} = ${uuid})`;
}

const taskColumns = {
  id: task.id,
  uuid: task.uuid,
  title: task.title,
  description: task.description,
  status: task.status,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  projectUuid: project.uuid,
  parentUuid: parentTask.uuid,
  assigneeType: task.assigneeType,
  agentUuid: agent.uuid,
  userUuid: user.uuid,
};

export class DrizzleTaskRepository implements TaskRepository {
  constructor(private readonly database: Database) {}

  private baseQuery() {
    return this.database
      .select(taskColumns)
      .from(task)
      .innerJoin(project, eq(task.projectId, project.id))
      .leftJoin(parentTask, eq(task.parentId, parentTask.id))
      .leftJoin(
        agent,
        and(eq(task.assigneeId, agent.id), eq(task.assigneeType, "agent")),
      )
      .leftJoin(
        user,
        and(eq(task.assigneeId, user.id), eq(task.assigneeType, "user")),
      );
  }

  async findByUuid(uuid: string): Promise<Task | undefined> {
    const rows = await this.baseQuery().where(eq(task.uuid, uuid));
    const row = rows[0];

    return row ? toTask(row) : undefined;
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    const rows = await this.baseQuery().where(eq(project.uuid, projectId));

    return rows.map(toTask);
  }

  async findByStatusAndAssignee(
    status: TaskStatus,
    assignee: AssigneeRef,
  ): Promise<Task[]> {
    const assigneeCondition =
      assignee.type === "agent"
        ? eq(agent.uuid, assignee.uuid)
        : eq(user.uuid, assignee.uuid);
    const rows = await this.baseQuery().where(
      and(
        eq(task.status, status),
        eq(task.assigneeType, assignee.type),
        assigneeCondition,
      ),
    );

    return rows.map(toTask);
  }

  async findAll(): Promise<Task[]> {
    const rows = await this.baseQuery();

    return rows.map(toTask);
  }

  private buildFilters(filters?: {
    status?: TaskStatus;
    assignee?: AssigneeRef;
    projectId?: string;
  }): SQL | undefined {
    const conditions: SQL[] = [];
    if (filters?.status) conditions.push(eq(task.status, filters.status));
    if (filters?.assignee) {
      conditions.push(eq(task.assigneeType, filters.assignee.type));
      conditions.push(
        filters.assignee.type === "agent"
          ? eq(agent.uuid, filters.assignee.uuid)
          : eq(user.uuid, filters.assignee.uuid),
      );
    }
    if (filters?.projectId)
      conditions.push(eq(project.uuid, filters.projectId));
    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];

    return and(...conditions);
  }

  async count(filters?: {
    status?: TaskStatus;
    assignee?: AssigneeRef;
    projectId?: string;
  }): Promise<number> {
    const where = this.buildFilters(filters);
    const query = this.database
      .select({ count: drizzleCount() })
      .from(task)
      .innerJoin(project, eq(task.projectId, project.id))
      .leftJoin(
        agent,
        and(eq(task.assigneeId, agent.id), eq(task.assigneeType, "agent")),
      )
      .leftJoin(
        user,
        and(eq(task.assigneeId, user.id), eq(task.assigneeType, "user")),
      );
    const rows = where ? await query.where(where) : await query;

    return rows[0]?.count ?? 0;
  }

  async findPaginated(params: {
    limit: number;
    offset: number;
    status?: TaskStatus;
    assignee?: AssigneeRef;
    projectId?: string;
  }): Promise<Task[]> {
    const where = this.buildFilters(params);
    const query = this.baseQuery();
    const filtered = where ? query.where(where) : query;
    const rows = await filtered.limit(params.limit).offset(params.offset);

    return rows.map(toTask);
  }

  async create(data: CreateTask): Promise<Task> {
    if (data.parentId) {
      const parentRows = await this.database
        .select({ id: task.id })
        .from(task)
        .where(eq(task.uuid, data.parentId));
      if (parentRows.length === 0) {
        throw new Error(`Parent task not found: ${data.parentId}`);
      }
    }

    const rows = await this.database
      .insert(task)
      .values({
        title: data.title,
        description: data.description,
        projectId: resolveId(project, data.projectId),
        parentId: data.parentId ? resolveId(task, data.parentId) : undefined,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create task");
    }

    // Re-fetch with JOINs to get related UUIDs
    const created = await this.findByUuid(row.uuid);
    if (!created) {
      throw new Error("Failed to fetch created task");
    }

    return created;
  }

  async update(uuid: string, data: UpdateTask): Promise<Task | undefined> {
    const setData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) setData["title"] = data.title;
    if (data.description !== undefined)
      setData["description"] = data.description;
    if (data.projectId !== undefined)
      setData["projectId"] = resolveId(project, data.projectId);
    if (data.parentId !== undefined)
      setData["parentId"] =
        data.parentId === null ? null : resolveId(task, data.parentId);

    const rows = await this.database
      .update(task)
      .set(setData)
      .where(eq(task.uuid, uuid))
      .returning();
    const row = rows[0];
    if (!row) return undefined;

    return this.findByUuid(row.uuid);
  }

  async assign(uuid: string, assignee: AssigneeRef): Promise<Task | undefined> {
    const target = assignee.type === "agent" ? agent : user;
    const rows = await this.database
      .update(task)
      .set({
        assigneeId: resolveId(target, assignee.uuid),
        assigneeType: assignee.type,
        updatedAt: new Date(),
      })
      .where(eq(task.uuid, uuid))
      .returning();
    const row = rows[0];
    if (!row) return undefined;

    return this.findByUuid(row.uuid);
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
    if (!row) return undefined;

    return this.findByUuid(row.uuid);
  }
}
