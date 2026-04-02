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
  uuid: string;
  name: string;
  token: string;
  status: WorkerStatus;
  lastHeartbeatAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkerJob {
  uuid: string;
  workerId: string;
  type: JobType;
  status: JobStatus;
  taskId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateWorker = z.infer<typeof createWorkerSchema>;
export type CreateJob = z.infer<typeof createJobSchema>;
export type UpdateJobStatus = z.infer<typeof updateJobStatusSchema>;

export interface WorkerReader {
  findByUuid(uuid: string): Promise<Worker | undefined>;
  findByToken(token: string): Promise<Worker | undefined>;
  findAll(): Promise<Worker[]>;
  findActive(): Promise<Worker[]>;
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
}

export interface WorkerJobWriter {
  createJob(workerId: string, data: CreateJob): Promise<WorkerJob>;
  updateJobStatus(
    uuid: string,
    status: JobStatus,
  ): Promise<WorkerJob | undefined>;
}

export interface WorkerJobRepository extends WorkerJobReader, WorkerJobWriter {}
