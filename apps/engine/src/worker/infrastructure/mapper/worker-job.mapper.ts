import { IriBuilder } from "@/shared/domain/iri/iri-builder.js";
import type { WorkerJob } from "@/worker/domain/entity/worker-job.entity.js";
import type { JobStatus } from "@/worker/domain/value-object/job-status.value-object.js";
import type { JobType } from "@/worker/domain/value-object/job-type.value-object.js";

export interface WorkerJobRow {
  uuid: string;
  type: JobType;
  status: JobStatus;
  failReason: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  workerUuid: string;
  taskUuid: string | null;
}

export class WorkerJobMapper {
  constructor(private readonly iri: IriBuilder = new IriBuilder()) {}

  toEntity(row: WorkerJobRow): WorkerJob {
    return {
      "@id": this.iri.build("jobs", row.uuid),
      uuid: row.uuid,
      worker: this.iri.build("workers", row.workerUuid),
      type: row.type,
      status: row.status,
      task: row.taskUuid ? this.iri.build("tasks", row.taskUuid) : null,
      failReason: row.failReason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
