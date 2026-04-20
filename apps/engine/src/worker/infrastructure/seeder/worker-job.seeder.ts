import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import type { WorkerJob } from "@/worker/domain/entity/worker-job.entity.js";
import type { JobType } from "@/worker/domain/value-object/job-type.value-object.js";
import { DrizzleWorkerJobRepository } from "@/worker/infrastructure/repository/drizzle-worker-job.repository.js";

export interface WorkerJobSeedOverrides {
  workerId: string;
  type?: JobType;
  taskId?: string;
}

export class WorkerJobSeeder {
  private readonly repository: DrizzleWorkerJobRepository;
  private counter = 0;

  constructor(database: Database) {
    this.repository = new DrizzleWorkerJobRepository(database);
  }

  async create(overrides: WorkerJobSeedOverrides): Promise<WorkerJob> {
    this.counter += 1;

    return this.repository.createJob(overrides.workerId, {
      type: overrides.type ?? "execute_task",
      taskId: overrides.taskId,
    });
  }

  reset(): void {
    this.counter = 0;
  }
}
