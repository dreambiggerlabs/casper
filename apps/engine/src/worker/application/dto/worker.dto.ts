import { z } from "zod";

import { IriSchemaFactory } from "@/shared/domain/iri/iri-schema.factory.js";
import { JOB_STATUS_VALUES } from "@/worker/domain/value-object/job-status.value-object.js";
import { JOB_TYPE_VALUES } from "@/worker/domain/value-object/job-type.value-object.js";

const iriSchemas = new IriSchemaFactory();

const jobTypeSchema = z.enum(JOB_TYPE_VALUES);

const jobStatusSchema = z.enum(JOB_STATUS_VALUES);

export const WorkerDto = {
  jobType: jobTypeSchema,
  jobStatus: jobStatusSchema,

  register: z.object({
    name: z.string().min(1, "Name is required").max(255).optional(),
  }),

  createJob: z
    .object({
      worker: iriSchemas.iri("workers"),
      type: jobTypeSchema,
      task: iriSchemas.iri("tasks").optional(),
    })
    .transform(({ worker, type, task }) => ({
      workerId: worker,
      type,
      taskId: task,
    })),

  updateJobStatus: z.object({
    status: jobStatusSchema,
    failReason: z.string().optional(),
  }),

  claimTask: z
    .object({
      worker: iriSchemas.iri("workers"),
    })
    .transform(({ worker }) => ({
      workerUuid: worker,
    })),
} as const;

export type RegisterWorker = z.infer<typeof WorkerDto.register>;
export type CreateJob = z.infer<typeof WorkerDto.createJob>;
export type UpdateJobStatus = z.infer<typeof WorkerDto.updateJobStatus>;
export type ClaimTask = z.infer<typeof WorkerDto.claimTask>;
