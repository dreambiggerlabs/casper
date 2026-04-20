import { randomBytes } from "crypto";

import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import type { Worker } from "@/worker/domain/entity/worker.entity.js";
import { DrizzleWorkerRepository } from "@/worker/infrastructure/repository/drizzle-worker.repository.js";

export interface WorkerSeedOverrides {
  name?: string;
  token?: string;
}

export class WorkerSeeder {
  private readonly repository: DrizzleWorkerRepository;
  private counter = 0;

  constructor(database: Database) {
    this.repository = new DrizzleWorkerRepository(database);
  }

  async create(overrides: WorkerSeedOverrides = {}): Promise<Worker> {
    this.counter += 1;

    return this.repository.create({
      name: overrides.name ?? `Worker ${this.counter}`,
      token: overrides.token ?? randomBytes(32).toString("hex"),
    });
  }

  reset(): void {
    this.counter = 0;
  }
}
