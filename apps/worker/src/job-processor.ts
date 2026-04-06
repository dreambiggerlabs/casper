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
      // Mark as failed
      await this.engineClient.updateJobStatus(job.uuid, "failed");
      jobLogger.error({ err: error }, "Job failed");
      throw error;
    }
  }

  private async processExecuteTask(
    job: WorkerJob,
    jobLogger: Logger,
  ): Promise<void> {
    if (!job.taskId) {
      throw new Error("execute_task job must have a taskId");
    }

    const task = await this.engineClient.getTask(job.taskId);
    jobLogger.info(
      { taskId: task.uuid, taskTitle: task.title },
      "Executing task",
    );

    // Mark task as in_progress
    await this.engineClient.updateTaskStatus(task.uuid, "in_progress");
    jobLogger.debug({ taskId: task.uuid }, "Task marked as in_progress");

    // Spawn agent (mock)
    if (task.agentId) {
      jobLogger.info(
        { agentId: task.agentId, taskId: task.uuid },
        "Spawning agent for task (mock)",
      );
    }

    // Placeholder: actual processing would happen here
    jobLogger.debug({ taskId: task.uuid }, "Task processing complete");

    // Mark task as completed
    await this.engineClient.updateTaskStatus(task.uuid, "completed");
    jobLogger.debug({ taskId: task.uuid }, "Task marked as completed");
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
