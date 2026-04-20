import {
  eq,
  and,
  count as drizzleCount,
  sql,
  type SQL,
  type AnyColumn,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { agent } from "@/agent/infrastructure/schema/agent.schema.js";
import { project } from "@/project/infrastructure/schema/project.schema.js";
import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import { user } from "@/user/infrastructure/schema/user.schema.js";
import type { CreateTask, UpdateTask } from "@/task/application/dto/task.dto.js";
import type {
  TaskFilters,
  TaskRepository,
} from "@/task/application/port/task.repository.js";
import type { Task } from "@/task/domain/entity/task.entity.js";
import type { AssigneeRef } from "@/task/domain/value-object/assignee.value-object.js";
import type { TaskStatus } from "@/task/domain/value-object/task-status.value-object.js";

import { TaskMapper } from "@/task/infrastructure/mapper/task.mapper.js";
import { task } from "@/task/infrastructure/schema/task.schema.js";

const parentTask = alias(task, "parent_task");

export class DrizzleTaskRepository implements TaskRepository {
  constructor(
    private readonly database: Database,
    private readonly mapper: TaskMapper = new TaskMapper(),
  ) {}

  private get columns() {
    return {
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
  }

  private baseQuery() {
    return this.database
      .select(this.columns)
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

  private resolveId(table: { id: AnyColumn; uuid: AnyColumn }, uuid: string) {
    return sql<number>`(SELECT ${table.id} FROM ${table} WHERE ${table.uuid} = ${uuid})`;
  }

  private buildFilters(filters?: TaskFilters): SQL | undefined {
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

  async findByUuid(uuid: string): Promise<Task | undefined> {
    const rows = await this.baseQuery().where(eq(task.uuid, uuid));
    const row = rows[0];

    return row ? this.mapper.toEntity(row) : undefined;
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    const rows = await this.baseQuery().where(eq(project.uuid, projectId));

    return rows.map((row) => this.mapper.toEntity(row));
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

    return rows.map((row) => this.mapper.toEntity(row));
  }

  async findAll(): Promise<Task[]> {
    const rows = await this.baseQuery();

    return rows.map((row) => this.mapper.toEntity(row));
  }

  async count(filters?: TaskFilters): Promise<number> {
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

  async findPaginated(
    params: { limit: number; offset: number } & TaskFilters,
  ): Promise<Task[]> {
    const where = this.buildFilters(params);
    const query = this.baseQuery();
    const filtered = where ? query.where(where) : query;
    const rows = await filtered.limit(params.limit).offset(params.offset);

    return rows.map((row) => this.mapper.toEntity(row));
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
        projectId: this.resolveId(project, data.projectId),
        parentId: data.parentId
          ? this.resolveId(task, data.parentId)
          : undefined,
      })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create task");
    }

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
      setData["projectId"] = this.resolveId(project, data.projectId);
    if (data.parentId !== undefined)
      setData["parentId"] =
        data.parentId === null ? null : this.resolveId(task, data.parentId);

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
        assigneeId: this.resolveId(target, assignee.uuid),
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
