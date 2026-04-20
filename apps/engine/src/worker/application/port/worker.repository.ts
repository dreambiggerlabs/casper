import type { Worker } from "@/worker/domain/entity/worker.entity.js";
import type { WorkerStatus } from "@/worker/domain/value-object/worker-status.value-object.js";

export interface WorkerReader {
  findByUuid(uuid: string): Promise<Worker | undefined>;
  findByToken(token: string): Promise<Worker | undefined>;
  findAll(): Promise<Worker[]>;
  findActive(): Promise<Worker[]>;
  count(): Promise<number>;
  findPaginated(params: { limit: number; offset: number }): Promise<Worker[]>;
}

export interface WorkerWriter {
  create(data: { name: string; token: string }): Promise<Worker>;
  updateHeartbeat(
    uuid: string,
    status?: WorkerStatus,
  ): Promise<Worker | undefined>;
}

export interface WorkerRepository extends WorkerReader, WorkerWriter {}
