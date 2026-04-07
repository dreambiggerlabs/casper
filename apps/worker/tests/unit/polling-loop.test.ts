import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { EngineClient } from "../../src/engine-client.js";
import type { JobProcessor } from "../../src/job-processor.js";
import { PollingLoop } from "../../src/polling-loop.js";

function createMockEngineClient(): EngineClient {
  return {
    registerWorker: vi.fn(),
    heartbeat: vi.fn(),
    fetchPendingJobs: vi.fn(),
    claimTask: vi.fn(),
    getJob: vi.fn(),
    updateJobStatus: vi.fn(),
    getTask: vi.fn(),
    updateTaskStatus: vi.fn(),
  } as unknown as EngineClient;
}

function createMockJobProcessor(): JobProcessor {
  return {
    process: vi.fn(),
  } as unknown as JobProcessor;
}

const WORKER_ID = "550e8400-e29b-41d4-a716-446655440004";

describe("PollingLoop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should fetch and process pending jobs on first poll", async () => {
    const mockClient = createMockEngineClient();
    const mockProcessor = createMockJobProcessor();

    const jobs = [
      {
        uuid: "job-1",
        worker: `/workers/${WORKER_ID}`,
        type: "execute_task" as const,
        status: "ready" as const,
        task: "/tasks/task-1",
        failReason: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        uuid: "job-2",
        worker: `/workers/${WORKER_ID}`,
        type: "cleanup" as const,
        status: "ready" as const,
        task: null,
        failReason: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    vi.mocked(mockClient.claimTask).mockResolvedValue(null);
    vi.mocked(mockClient.fetchPendingJobs).mockResolvedValue(jobs);
    vi.mocked(mockProcessor.process).mockResolvedValue();

    const pollingLoop = new PollingLoop(
      mockClient,
      mockProcessor,
      WORKER_ID,
    );

    pollingLoop.start();

    // Advance past the first poll
    await vi.advanceTimersByTimeAsync(0);

    expect(mockClient.claimTask).toHaveBeenCalledTimes(1);
    expect(mockClient.claimTask).toHaveBeenCalledWith(WORKER_ID);
    expect(mockClient.fetchPendingJobs).toHaveBeenCalledTimes(1);
    expect(mockClient.fetchPendingJobs).toHaveBeenCalledWith(WORKER_ID);
    expect(mockProcessor.process).toHaveBeenCalledTimes(2);

    pollingLoop.stop();
  });

  it("should continue polling after errors", async () => {
    const mockClient = createMockEngineClient();
    const mockProcessor = createMockJobProcessor();

    vi.mocked(mockClient.claimTask).mockResolvedValue(null);
    vi.mocked(mockClient.fetchPendingJobs)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce([]);

    const pollingLoop = new PollingLoop(
      mockClient,
      mockProcessor,
      WORKER_ID,
    );

    pollingLoop.start();

    // First poll (error)
    await vi.advanceTimersByTimeAsync(0);
    expect(mockClient.fetchPendingJobs).toHaveBeenCalledTimes(1);

    // Second poll (success) after interval (5 seconds)
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockClient.fetchPendingJobs).toHaveBeenCalledTimes(2);

    pollingLoop.stop();
  });

  it("should claim a task and then process the resulting job", async () => {
    const mockClient = createMockEngineClient();
    const mockProcessor = createMockJobProcessor();

    const claimResult = {
      job: {
        uuid: "job-claimed",
        worker: `/workers/${WORKER_ID}`,
        type: "execute_task" as const,
        status: "ready" as const,
        task: "/tasks/task-claimed",
        failReason: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      task: {
        uuid: "task-claimed",
        title: "Claimed task",
        status: "in_progress" as const,
        agentId: "agent-1",
      },
    };

    vi.mocked(mockClient.claimTask).mockResolvedValueOnce(claimResult);
    vi.mocked(mockClient.fetchPendingJobs).mockResolvedValue([
      claimResult.job,
    ]);
    vi.mocked(mockProcessor.process).mockResolvedValue();

    const pollingLoop = new PollingLoop(
      mockClient,
      mockProcessor,
      WORKER_ID,
    );

    pollingLoop.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockClient.claimTask).toHaveBeenCalledWith(WORKER_ID);
    expect(mockClient.fetchPendingJobs).toHaveBeenCalledWith(WORKER_ID);
    expect(mockProcessor.process).toHaveBeenCalledWith(claimResult.job);

    pollingLoop.stop();
  });

  it("should continue polling when claim errors", async () => {
    const mockClient = createMockEngineClient();
    const mockProcessor = createMockJobProcessor();

    vi.mocked(mockClient.claimTask).mockRejectedValueOnce(
      new Error("Claim failed"),
    );
    // After error, the whole try block catches so fetchPendingJobs won't be called
    // On second iteration, claim succeeds
    vi.mocked(mockClient.claimTask).mockResolvedValueOnce(null);
    vi.mocked(mockClient.fetchPendingJobs).mockResolvedValue([]);

    const pollingLoop = new PollingLoop(
      mockClient,
      mockProcessor,
      WORKER_ID,
    );

    pollingLoop.start();

    // First poll (claim error)
    await vi.advanceTimersByTimeAsync(0);
    expect(mockClient.claimTask).toHaveBeenCalledTimes(1);

    // Second poll (success)
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockClient.claimTask).toHaveBeenCalledTimes(2);
    expect(mockClient.fetchPendingJobs).toHaveBeenCalledTimes(1);

    pollingLoop.stop();
  });

  it("should stop when stop() is called", async () => {
    const mockClient = createMockEngineClient();
    const mockProcessor = createMockJobProcessor();

    vi.mocked(mockClient.claimTask).mockResolvedValue(null);
    vi.mocked(mockClient.fetchPendingJobs).mockResolvedValue([]);

    const pollingLoop = new PollingLoop(
      mockClient,
      mockProcessor,
      WORKER_ID,
    );

    pollingLoop.start();

    // First poll
    await vi.advanceTimersByTimeAsync(0);
    expect(mockClient.fetchPendingJobs).toHaveBeenCalledTimes(1);

    pollingLoop.stop();

    // Advance time - should not poll anymore
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockClient.fetchPendingJobs).toHaveBeenCalledTimes(1);
  });

  it("should send heartbeat on interval", async () => {
    const mockClient = createMockEngineClient();
    const mockProcessor = createMockJobProcessor();

    vi.mocked(mockClient.claimTask).mockResolvedValue(null);
    vi.mocked(mockClient.fetchPendingJobs).mockResolvedValue([]);
    vi.mocked(mockClient.heartbeat).mockResolvedValue({} as never);

    const pollingLoop = new PollingLoop(
      mockClient,
      mockProcessor,
      WORKER_ID,
    );

    pollingLoop.start();

    // Initial heartbeat
    await vi.advanceTimersByTimeAsync(0);
    expect(mockClient.heartbeat).toHaveBeenCalledTimes(1);

    // Next heartbeat after interval (30 seconds)
    await vi.advanceTimersByTimeAsync(30000);
    expect(mockClient.heartbeat).toHaveBeenCalledTimes(2);

    pollingLoop.stop();
  });
});