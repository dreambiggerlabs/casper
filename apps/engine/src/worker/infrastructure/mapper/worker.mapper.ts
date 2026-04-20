import { IriBuilder } from "@/shared/domain/iri/iri-builder.js";
import type { Worker } from "@/worker/domain/entity/worker.entity.js";
import type { worker as workerTable } from "@/worker/infrastructure/schema/worker.schema.js";

export class WorkerMapper {
  constructor(private readonly iri: IriBuilder = new IriBuilder()) {}

  toEntity(row: typeof workerTable.$inferSelect): Worker {
    return {
      "@id": this.iri.build("workers", row.uuid),
      uuid: row.uuid,
      name: row.name,
      token: row.token,
      status: row.status,
      lastHeartbeatAt: row.lastHeartbeatAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
