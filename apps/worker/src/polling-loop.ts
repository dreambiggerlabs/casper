import type { EngineClient } from "./engine-client.js";
import type { JobProcessor } from "./job-processor.js";

const POLL_INTERVAL_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 30000;

export class PollingLoop {
  private isRunning = false;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly engineClient: EngineClient,
    private readonly jobProcessor: JobProcessor,
    private readonly workerId: string,
  ) {}

  start(): void {
    this.isRunning = true;
    console.log(`[Worker] Polling started for worker ${this.workerId}`);

    // Start heartbeat interval
    this.startHeartbeat();

    // Start polling
    void this.poll();
  }

  stop(): void {
    this.isRunning = false;
    this.stopHeartbeat();
    console.log("[Worker] Polling stopped");
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
    } catch (error) {
      console.error("[Worker] Failed to send heartbeat:", error);
    }
  }

  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        const jobs = await this.engineClient.fetchPendingJobs(this.workerId);
        for (const job of jobs) {
          await this.jobProcessor.process(job);
        }
      } catch (error) {
        console.error("[Worker] Polling error:", error);
      }
      await this.sleep(POLL_INTERVAL_MS);
    }
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}