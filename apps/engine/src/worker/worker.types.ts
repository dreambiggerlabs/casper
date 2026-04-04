import type { z } from "zod";

import type {
  createWorkerSchema,
  createJobSchema,
  updateJobStatusSchema,
} from "./worker.schema.js";

export type WorkerStatus = "active" | "inactive";
export type JobType =
  | "execute_task"
  | "cleanup"
  | "start_preview"
  | "stop_preview";
export type JobStatus = "pending" | "in_progress" | "completed" | "failed";

export interface Worker {
  "@id": string;
  uuid: string;
  name: string;
  token: string;
  status: WorkerStatus;
  lastHeartbeatAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface WorkerJob {
  "@id": string;
  uuid: string;
  worker: string;
  type: JobType;
  status: JobStatus;
  task: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export type CreateWorker = z.infer<typeof createWorkerSchema>;
export type CreateJob = z.infer<typeof createJobSchema>;
export type UpdateJobStatus = z.infer<typeof updateJobStatusSchema>;

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
    data: { type: string; taskId?: string },
  ): Promise<WorkerJob>;
  updateJobStatus(
    uuid: string,
    status: JobStatus,
  ): Promise<WorkerJob | undefined>;
}

export interface WorkerJobRepository extends WorkerJobReader, WorkerJobWriter {}
