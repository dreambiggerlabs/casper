import { describe, it, expect, vi } from "vitest";

import { EngineClient } from "../../src/engine-client.js";
import { JobProcessor } from "../../src/job-processor.js";

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

const WORKER_ID = "550e8400-e29b-41d4-a716-446655440004";

describe("JobProcessor", () => {
  describe("process", () => {
    it("should mark job in_progress, execute task, then move task to review", async () => {
      const mockClient = createMockEngineClient();

      vi.mocked(mockClient.getTask).mockResolvedValue({
        uuid: "task-1",
        title: "Test Task",
        status: "in_progress",
        agentId: "agent-1",
      });
      vi.mocked(mockClient.updateJobStatus)
        .mockResolvedValueOnce({
          uuid: "job-1",
          worker: `/workers/${WORKER_ID}`,
          type: "execute_task",
          status: "in_progress",
          task: "/tasks/task-1",
          failReason: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        })
        .mockResolvedValueOnce({
          uuid: "job-1",
          worker: `/workers/${WORKER_ID}`,
          type: "execute_task",
          status: "completed",
          task: "/tasks/task-1",
          failReason: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        });
      vi.mocked(mockClient.updateTaskStatus).mockResolvedValueOnce({
        uuid: "task-1",
        title: "Test Task",
        status: "review",
        agentId: "agent-1",
      });

      const processor = new JobProcessor(mockClient);
      await processor.process({
        uuid: "job-1",
        worker: `/workers/${WORKER_ID}`,
        type: "execute_task",
        status: "ready",
        task: "/tasks/task-1",
        failReason: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });

      expect(mockClient.updateJobStatus).toHaveBeenCalledTimes(2);
      expect(mockClient.updateJobStatus).toHaveBeenNthCalledWith(1, "job-1", "in_progress");
      expect(mockClient.updateJobStatus).toHaveBeenNthCalledWith(2, "job-1", "completed");
      expect(mockClient.getTask).toHaveBeenCalledWith("task-1");
      expect(mockClient.updateTaskStatus).toHaveBeenCalledTimes(1);
      expect(mockClient.updateTaskStatus).toHaveBeenCalledWith("task-1", "review");
    });

    it("should throw if execute_task job has no task", async () => {
      const mockClient = createMockEngineClient();
      vi.mocked(mockClient.updateJobStatus).mockResolvedValue({
        uuid: "job-1",
        worker: `/workers/${WORKER_ID}`,
        type: "execute_task",
        status: "in_progress",
        task: null,
        failReason: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });

      const processor = new JobProcessor(mockClient);

      await expect(processor.process({
        uuid: "job-1",
        worker: `/workers/${WORKER_ID}`,
        type: "execute_task",
        status: "ready",
        task: null,
        failReason: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      })).rejects.toThrow("execute_task job must have a task");
    });

    it("should mark job as failed and release task for retry on error", async () => {
      const mockClient = createMockEngineClient();

      vi.mocked(mockClient.updateJobStatus)
        .mockResolvedValueOnce({
          uuid: "job-1",
          worker: `/workers/${WORKER_ID}`,
          type: "execute_task",
          status: "in_progress",
          task: "/tasks/task-1",
          failReason: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        });
      vi.mocked(mockClient.getTask).mockRejectedValue(new Error("Task not found"));
      vi.mocked(mockClient.updateJobStatus).mockResolvedValueOnce({
        uuid: "job-1",
        worker: `/workers/${WORKER_ID}`,
        type: "execute_task",
        status: "failed",
        task: "/tasks/task-1",
        failReason: "Task not found",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });
      vi.mocked(mockClient.updateTaskStatus).mockResolvedValueOnce({
        uuid: "task-1",
        title: "Test Task",
        status: "ready",
        agentId: "agent-1",
      });

      const processor = new JobProcessor(mockClient);

      await expect(processor.process({
        uuid: "job-1",
        worker: `/workers/${WORKER_ID}`,
        type: "execute_task",
        status: "ready",
        task: "/tasks/task-1",
        failReason: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      })).rejects.toThrow("Task not found");

      expect(mockClient.updateJobStatus).toHaveBeenCalledWith("job-1", "failed", "Task not found");
      expect(mockClient.updateTaskStatus).toHaveBeenCalledWith("task-1", "ready");
    });

    it("should process cleanup job", async () => {
      const mockClient = createMockEngineClient();
      vi.mocked(mockClient.updateJobStatus)
        .mockResolvedValueOnce({
          uuid: "job-1",
          worker: `/workers/${WORKER_ID}`,
          type: "cleanup",
          status: "in_progress",
          task: null,
          failReason: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        })
        .mockResolvedValueOnce({
          uuid: "job-1",
          worker: `/workers/${WORKER_ID}`,
          type: "cleanup",
          status: "completed",
          task: null,
          failReason: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        });

      const processor = new JobProcessor(mockClient);
      await processor.process({
        uuid: "job-1",
        worker: `/workers/${WORKER_ID}`,
        type: "cleanup",
        status: "ready",
        task: null,
        failReason: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });

      expect(mockClient.updateJobStatus).toHaveBeenCalledTimes(2);
      expect(mockClient.updateJobStatus).toHaveBeenNthCalledWith(1, "job-1", "in_progress");
      expect(mockClient.updateJobStatus).toHaveBeenNthCalledWith(2, "job-1", "completed");
    });

    it("should process start_preview job", async () => {
      const mockClient = createMockEngineClient();
      vi.mocked(mockClient.updateJobStatus)
        .mockResolvedValueOnce({
          uuid: "job-1",
          worker: `/workers/${WORKER_ID}`,
          type: "start_preview",
          status: "in_progress",
          task: null,
          failReason: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        })
        .mockResolvedValueOnce({
          uuid: "job-1",
          worker: `/workers/${WORKER_ID}`,
          type: "start_preview",
          status: "completed",
          task: null,
          failReason: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        });

      const processor = new JobProcessor(mockClient);
      await processor.process({
        uuid: "job-1",
        worker: `/workers/${WORKER_ID}`,
        type: "start_preview",
        status: "ready",
        task: null,
        failReason: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });

      expect(mockClient.updateJobStatus).toHaveBeenCalledTimes(2);
    });

    it("should process stop_preview job", async () => {
      const mockClient = createMockEngineClient();
      vi.mocked(mockClient.updateJobStatus)
        .mockResolvedValueOnce({
          uuid: "job-1",
          worker: `/workers/${WORKER_ID}`,
          type: "stop_preview",
          status: "in_progress",
          task: null,
          failReason: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        })
        .mockResolvedValueOnce({
          uuid: "job-1",
          worker: `/workers/${WORKER_ID}`,
          type: "stop_preview",
          status: "completed",
          task: null,
          failReason: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        });

      const processor = new JobProcessor(mockClient);
      await processor.process({
        uuid: "job-1",
        worker: `/workers/${WORKER_ID}`,
        type: "stop_preview",
        status: "ready",
        task: null,
        failReason: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });

      expect(mockClient.updateJobStatus).toHaveBeenCalledTimes(2);
    });
  });
});