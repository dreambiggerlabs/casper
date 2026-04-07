import { logger } from "./logging/logger.js";
import type { EngineClient } from "./engine-client.js";
import type { JobProcessor } from "./job-processor.js";

const POLL_INTERVAL_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 30000;

export class PollingLoop {
  private isRunning = false;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private isBusy = false;
  private lastIdleLog = 0;

  constructor(
    private readonly engineClient: EngineClient,
    private readonly jobProcessor: JobProcessor,
    private readonly workerId: string,
  ) {}

  start(): void {
    this.isRunning = true;
    this.lastIdleLog = Date.now();
    logger.info({ workerId: this.workerId }, "Polling started");

    // Start heartbeat interval
    this.startHeartbeat();

    // Start polling
    void this.poll();
  }

  stop(): void {
    this.isRunning = false;
    this.stopHeartbeat();
    logger.info("Polling stopped");
  }

  private startHeartbeat(): void {
    // Send initial heartbeat
    void this.sendHeartbeat();

    // Set up interval
    this.heartbeatIntervalId = setInterval(() => {
      void this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private async sendHeartbeat(): Promise<void> {
    try {
      await this.engineClient.heartbeat(this.workerId);
      logger.debug({ workerId: this.workerId }, "Heartbeat sent");
    } catch (error) {
      logger.error(
        { err: error, workerId: this.workerId },
        "Failed to send heartbeat",
      );
    }
  }

  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        // Phase 1: Try to claim an available task
        await this.claimAvailableTask();

        // Phase 2: Process already-assigned jobs
        const jobs = await this.engineClient.fetchPendingJobs(this.workerId);
        const jobCount = jobs.length;

        if (jobCount > 0) {
          logger.info(
            { workerId: this.workerId, jobCount },
            "Fetched pending jobs",
          );

          // State transition: idle → busy
          if (!this.isBusy) {
            logger.info(
              { workerId: this.workerId },
              "Worker state: idle → busy",
            );
            this.isBusy = true;
          }

          for (const job of jobs) {
            await this.jobProcessor.process(job);
          }
        } else {
          // State transition: busy → idle
          if (this.isBusy) {
            logger.info(
              { workerId: this.workerId },
              "Worker state: busy → idle",
            );
            this.isBusy = false;
            this.lastIdleLog = Date.now();
            logger.debug({ workerId: this.workerId }, "Worker idle");
          } else {
            // Periodic idle log (every ~60s)
            const now = Date.now();
            if (now - this.lastIdleLog > 60_000) {
              logger.debug({ workerId: this.workerId }, "Worker idle");
              this.lastIdleLog = now;
            }
          }
        }
      } catch (error) {
        logger.error({ err: error, workerId: this.workerId }, "Polling error");
      }
      await this.sleep(POLL_INTERVAL_MS);
    }
  }

  private async claimAvailableTask(): Promise<void> {
    const result = await this.engineClient.claimTask(this.workerId);
    if (result) {
      logger.info(
        { taskId: result.task.uuid, jobId: result.job.uuid },
        "Claimed task, job created",
      );
    }
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
