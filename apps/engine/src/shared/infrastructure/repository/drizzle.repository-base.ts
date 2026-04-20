import { eq, count as drizzleCount, type Column } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import type { Database } from "@/shared/infrastructure/database/database-connection.js";

export interface EntityMapper<TRow, TEntity> {
  toEntity(row: TRow): TEntity;
}

export abstract class DrizzleRepositoryBase<TEntity, TRow> {
  protected constructor(
    protected readonly database: Database,
    protected readonly table: PgTable,
    protected readonly uuidColumn: Column,
    protected readonly mapper: EntityMapper<TRow, TEntity>,
  ) {}

  async findByUuid(uuid: string): Promise<TEntity | undefined> {
    const rows = await this.database
      .select()
      .from(this.table)
      .where(eq(this.uuidColumn, uuid));
    const row = rows[0] as TRow | undefined;

    return row ? this.mapper.toEntity(row) : undefined;
  }

  async findAll(): Promise<TEntity[]> {
    const rows = (await this.database.select().from(this.table)) as TRow[];

    return rows.map((row) => this.mapper.toEntity(row));
  }

  async count(): Promise<number> {
    const rows = await this.database
      .select({ count: drizzleCount() })
      .from(this.table);

    return rows[0]?.count ?? 0;
  }

  async findPaginated(params: {
    limit: number;
    offset: number;
  }): Promise<TEntity[]> {
    const rows = (await this.database
      .select()
      .from(this.table)
      .limit(params.limit)
      .offset(params.offset)) as TRow[];

    return rows.map((row) => this.mapper.toEntity(row));
  }
}
