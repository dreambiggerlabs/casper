import type { Task } from "@/task/domain/entity/task.entity.js";
import type { WorkerJob } from "@/worker/domain/entity/worker-job.entity.js";
import type { JobStatus } from "@/worker/domain/value-object/job-status.value-object.js";
import type { JobType } from "@/worker/domain/value-object/job-type.value-object.js";

export interface WorkerJobReader {
  findJobByUuid(uuid: string): Promise<WorkerJob | undefined>;
  findJobsByWorkerId(
    workerId: string,
    status?: JobStatus,
  ): Promise<WorkerJob[]>;
  findJobByTaskId(taskId: string): Promise<WorkerJob | undefined>;
  countJobs(workerId: string, status?: JobStatus): Promise<number>;
  findJobsPaginated(params: {
    workerId: string;
    status?: JobStatus;
    limit: number;
    offset: number;
  }): Promise<WorkerJob[]>;
}

export interface WorkerJobWriter {
  createJob(
    workerId: string,
    data: { type: JobType; taskId?: string },
  ): Promise<WorkerJob>;
  updateJobStatus(
    uuid: string,
    status: JobStatus,
    failReason?: string,
  ): Promise<WorkerJob | undefined>;
  claimAvailableTask(
    workerUuid: string,
  ): Promise<{ job: WorkerJob; task: Task } | null>;
}

export interface WorkerJobRepository extends WorkerJobReader, WorkerJobWriter {}
