import type { EngineClient } from "./engine-client.js";
import type { WorkerJob } from "./types.js";

export class JobProcessor {
  constructor(private readonly engineClient: EngineClient) {}

  async process(job: WorkerJob): Promise<void> {
    console.log(`[Worker] Processing job: ${job.uuid} - type: ${job.type}`);

    // Mark job as in_progress
    await this.engineClient.updateJobStatus(job.uuid, "in_progress");
    console.log(`[Worker] Job ${job.uuid} marked as in_progress`);

    try {
      // Process based on job type
      switch (job.type) {
        case "execute_task":
          await this.processExecuteTask(job);
          break;
        case "cleanup":
          await this.processCleanup(job);
          break;
        case "start_preview":
          await this.processStartPreview(job);
          break;
        case "stop_preview":
          await this.processStopPreview(job);
          break;
        default:
          throw new Error(`Unknown job type: ${(job as WorkerJob).type}`);
      }

      // Mark as completed
      await this.engineClient.updateJobStatus(job.uuid, "completed");
      console.log(`[Worker] Job ${job.uuid} marked as completed`);
    } catch (error) {
      // Mark as failed
      await this.engineClient.updateJobStatus(job.uuid, "failed");
      console.error(`[Worker] Job ${job.uuid} failed:`, error);
      throw error;
    }
  }

  private async processExecuteTask(job: WorkerJob): Promise<void> {
    if (!job.taskId) {
      throw new Error("execute_task job must have a taskId");
    }

    const task = await this.engineClient.getTask(job.taskId);
    console.log(`[Worker] Executing task: ${task.uuid} - "${task.title}"`);

    // Mark task as in_progress
    await this.engineClient.updateTaskStatus(task.uuid, "in_progress");
    console.log(`[Worker] Task ${task.uuid} marked as in_progress`);

    // Placeholder: actual processing would happen here
    console.log(`[Worker] Task ${task.uuid} processing complete`);

    // Mark task as completed
    await this.engineClient.updateTaskStatus(task.uuid, "completed");
    console.log(`[Worker] Task ${task.uuid} marked as completed`);
  }

  private async processCleanup(_job: WorkerJob): Promise<void> {
    // Placeholder: cleanup implementation
    console.log("[Worker] Processing cleanup job");
  }

  private async processStartPreview(_job: WorkerJob): Promise<void> {
    // Placeholder: start preview implementation
    console.log("[Worker] Processing start_preview job");
  }

  private async processStopPreview(_job: WorkerJob): Promise<void> {
    // Placeholder: stop preview implementation
    console.log("[Worker] Processing stop_preview job");
  }
}