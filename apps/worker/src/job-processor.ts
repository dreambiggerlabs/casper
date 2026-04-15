import type { Logger } from "pino";

import { logger } from "./logging/logger.js";
import type { EngineClient } from "./engine-client.js";
import type { WorkerJob } from "./types.js";

export class JobProcessor {
  constructor(private readonly engineClient: EngineClient) {}

  async process(job: WorkerJob): Promise<void> {
    const jobLogger = logger.child({ jobId: job.uuid, jobType: job.type });
    jobLogger.info("Processing job");

    // Mark job as in_progress
    await this.engineClient.updateJobStatus(job.uuid, "in_progress");
    jobLogger.debug("Job marked as in_progress");

    try {
      // Process based on job type
      switch (job.type) {
        case "execute_task":
          await this.processExecuteTask(job, jobLogger);
          break;
        case "cleanup":
          await this.processCleanup(job, jobLogger);
          break;
        case "start_preview":
          await this.processStartPreview(job, jobLogger);
          break;
        case "stop_preview":
          await this.processStopPreview(job, jobLogger);
          break;
        default:
          throw new Error(`Unknown job type: ${(job as WorkerJob).type}`);
      }

      // Mark as completed
      await this.engineClient.updateJobStatus(job.uuid, "completed");
      jobLogger.info("Job completed");
    } catch (error) {
      // Mark job as failed with reason
      const failReason = error instanceof Error ? error.message : String(error);
      await this.engineClient.updateJobStatus(job.uuid, "failed", failReason);

      // Release task back to ready so it can be retried
      if (job.task) {
        const taskUuid = this.parseIri(job.task);
        await this.engineClient.updateTaskStatus(taskUuid, "ready");
        jobLogger.info({ taskId: taskUuid }, "Task released for retry");
      }

      jobLogger.error({ err: error }, "Job failed");
      throw error;
    }
  }

  private parseIri(iri: string): string {
    const parts = iri.split("/");

    return parts[parts.length - 1] ?? iri;
  }

  private async processExecuteTask(
    job: WorkerJob,
    jobLogger: Logger,
  ): Promise<void> {
    if (!job.task) {
      throw new Error("execute_task job must have a task");
    }

    const taskUuid = this.parseIri(job.task);
    const task = await this.engineClient.getTask(taskUuid);
    jobLogger.info(
      { taskId: task.uuid, taskTitle: task.title },
      "Executing task",
    );

    // Spawn agent (mock) — only execute_task jobs claim agent-assigned tasks
    if (task.assignee) {
      jobLogger.info(
        { assignee: task.assignee, taskId: task.uuid },
        "Spawning agent for task (mock)",
      );
    }

    // Placeholder: actual processing would happen here
    jobLogger.debug({ taskId: task.uuid }, "Task processing complete");

    // Move task to review for human verification
    await this.engineClient.updateTaskStatus(task.uuid, "review");
    jobLogger.debug({ taskId: task.uuid }, "Task moved to review");
  }

  private async processCleanup(
    _job: WorkerJob,
    jobLogger: Logger,
  ): Promise<void> {
    // Placeholder: cleanup implementation
    jobLogger.debug("Processing cleanup job");
  }

  private async processStartPreview(
    _job: WorkerJob,
    jobLogger: Logger,
  ): Promise<void> {
    // Placeholder: start preview implementation
    jobLogger.debug("Processing start_preview job");
  }

  private async processStopPreview(
    _job: WorkerJob,
    jobLogger: Logger,
  ): Promise<void> {
    // Placeholder: stop preview implementation
    jobLogger.debug("Processing stop_preview job");
  }
}
