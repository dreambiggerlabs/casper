import type { JobStatus } from "@/worker/domain/value-object/job-status.value-object.js";
import type { JobType } from "@/worker/domain/value-object/job-type.value-object.js";

export interface WorkerJob {
  "@id": string;
  uuid: string;
  worker: string;
  type: JobType;
  status: JobStatus;
  task: string | null;
  failReason: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}
