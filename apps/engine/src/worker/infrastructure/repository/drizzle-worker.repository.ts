import { eq } from "drizzle-orm";

import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import { DrizzleRepositoryBase } from "@/shared/infrastructure/repository/drizzle.repository-base.js";
import type { WorkerRepository } from "@/worker/application/port/worker.repository.js";
import type { Worker } from "@/worker/domain/entity/worker.entity.js";
import type { WorkerStatus } from "@/worker/domain/value-object/worker-status.value-object.js";

import { WorkerMapper } from "@/worker/infrastructure/mapper/worker.mapper.js";
import { worker } from "@/worker/infrastructure/schema/worker.schema.js";

type WorkerRow = typeof worker.$inferSelect;

export class DrizzleWorkerRepository
  extends DrizzleRepositoryBase<Worker, WorkerRow>
  implements WorkerRepository
{
  constructor(database: Database, mapper: WorkerMapper = new WorkerMapper()) {
    super(database, worker, worker.uuid, mapper);
  }

  async findByToken(token: string): Promise<Worker | undefined> {
    const rows = await this.database
      .select()
      .from(worker)
      .where(eq(worker.token, token));
    const row = rows[0];

    return row ? this.mapper.toEntity(row) : undefined;
  }

  async findActive(): Promise<Worker[]> {
    const rows = await this.database
      .select()
      .from(worker)
      .where(eq(worker.status, "active"));

    return rows.map((row) => this.mapper.toEntity(row));
  }

  async create(data: { name: string; token: string }): Promise<Worker> {
    const rows = await this.database.insert(worker).values(data).returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create worker");
    }

    return this.mapper.toEntity(row);
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

    return row ? this.mapper.toEntity(row) : undefined;
  }
}
