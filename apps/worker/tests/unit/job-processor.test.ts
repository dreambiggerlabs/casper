import { describe, it, expect, vi } from "vitest";

import { EngineClient } from "../../src/engine-client.js";
import { JobProcessor } from "../../src/job-processor.js";

function createMockEngineClient(): EngineClient {
  return {
    registerWorker: vi.fn(),
    heartbeat: vi.fn(),
    fetchPendingJobs: vi.fn(),
    getJob: vi.fn(),
    updateJobStatus: vi.fn(),
    getTask: vi.fn(),
    updateTaskStatus: vi.fn(),
  } as unknown as EngineClient;
}

const WORKER_ID = "550e8400-e29b-41d4-a716-446655440004";

describe("JobProcessor", () => {
  describe("process", () => {
    it("should mark job in_progress, execute task, then mark completed", async () => {
      const mockClient = createMockEngineClient();

      vi.mocked(mockClient.getTask).mockResolvedValue({
        uuid: "task-1",
        title: "Test Task",
        status: "processing",
        agentId: "agent-1",
      });
      vi.mocked(mockClient.updateJobStatus)
        .mockResolvedValueOnce({
          uuid: "job-1",
          workerId: WORKER_ID,
          type: "execute_task",
          status: "in_progress",
          taskId: "task-1",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        })
        .mockResolvedValueOnce({
          uuid: "job-1",
          workerId: WORKER_ID,
          type: "execute_task",
          status: "completed",
          taskId: "task-1",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        });
      vi.mocked(mockClient.updateTaskStatus)
        .mockResolvedValueOnce({
          uuid: "task-1",
          title: "Test Task",
          status: "in_progress",
          agentId: "agent-1",
        })
        .mockResolvedValueOnce({
          uuid: "task-1",
          title: "Test Task",
          status: "completed",
          agentId: "agent-1",
        });

      const processor = new JobProcessor(mockClient);
      await processor.process({
        uuid: "job-1",
        workerId: WORKER_ID,
        type: "execute_task",
        status: "pending",
        taskId: "task-1",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });

      expect(mockClient.updateJobStatus).toHaveBeenCalledTimes(2);
      expect(mockClient.updateJobStatus).toHaveBeenNthCalledWith(1, "job-1", "in_progress");
      expect(mockClient.updateJobStatus).toHaveBeenNthCalledWith(2, "job-1", "completed");
      expect(mockClient.getTask).toHaveBeenCalledWith("task-1");
      expect(mockClient.updateTaskStatus).toHaveBeenCalledTimes(2);
      expect(mockClient.updateTaskStatus).toHaveBeenNthCalledWith(1, "task-1", "in_progress");
      expect(mockClient.updateTaskStatus).toHaveBeenNthCalledWith(2, "task-1", "completed");
    });

    it("should throw if execute_task job has no taskId", async () => {
      const mockClient = createMockEngineClient();
      vi.mocked(mockClient.updateJobStatus).mockResolvedValue({
        uuid: "job-1",
        workerId: WORKER_ID,
        type: "execute_task",
        status: "in_progress",
        taskId: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });

      const processor = new JobProcessor(mockClient);

      await expect(processor.process({
        uuid: "job-1",
        workerId: WORKER_ID,
        type: "execute_task",
        status: "pending",
        taskId: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      })).rejects.toThrow("execute_task job must have a taskId");
    });

    it("should mark job as failed on error", async () => {
      const mockClient = createMockEngineClient();

      vi.mocked(mockClient.updateJobStatus)
        .mockResolvedValueOnce({
          uuid: "job-1",
          workerId: WORKER_ID,
          type: "execute_task",
          status: "in_progress",
          taskId: "task-1",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        });
      vi.mocked(mockClient.getTask).mockRejectedValue(new Error("Task not found"));
      vi.mocked(mockClient.updateJobStatus).mockResolvedValueOnce({
        uuid: "job-1",
        workerId: WORKER_ID,
        type: "execute_task",
        status: "failed",
        taskId: "task-1",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });

      const processor = new JobProcessor(mockClient);

      await expect(processor.process({
        uuid: "job-1",
        workerId: WORKER_ID,
        type: "execute_task",
        status: "pending",
        taskId: "task-1",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      })).rejects.toThrow("Task not found");

      expect(mockClient.updateJobStatus).toHaveBeenCalledWith("job-1", "failed");
    });

    it("should process cleanup job", async () => {
      const mockClient = createMockEngineClient();
      vi.mocked(mockClient.updateJobStatus)
        .mockResolvedValueOnce({
          uuid: "job-1",
          workerId: WORKER_ID,
          type: "cleanup",
          status: "in_progress",
          taskId: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        })
        .mockResolvedValueOnce({
          uuid: "job-1",
          workerId: WORKER_ID,
          type: "cleanup",
          status: "completed",
          taskId: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        });

      const processor = new JobProcessor(mockClient);
      await processor.process({
        uuid: "job-1",
        workerId: WORKER_ID,
        type: "cleanup",
        status: "pending",
        taskId: null,
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
          workerId: WORKER_ID,
          type: "start_preview",
          status: "in_progress",
          taskId: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        })
        .mockResolvedValueOnce({
          uuid: "job-1",
          workerId: WORKER_ID,
          type: "start_preview",
          status: "completed",
          taskId: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        });

      const processor = new JobProcessor(mockClient);
      await processor.process({
        uuid: "job-1",
        workerId: WORKER_ID,
        type: "start_preview",
        status: "pending",
        taskId: null,
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
          workerId: WORKER_ID,
          type: "stop_preview",
          status: "in_progress",
          taskId: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        })
        .mockResolvedValueOnce({
          uuid: "job-1",
          workerId: WORKER_ID,
          type: "stop_preview",
          status: "completed",
          taskId: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        });

      const processor = new JobProcessor(mockClient);
      await processor.process({
        uuid: "job-1",
        workerId: WORKER_ID,
        type: "stop_preview",
        status: "pending",
        taskId: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });

      expect(mockClient.updateJobStatus).toHaveBeenCalledTimes(2);
    });
  });
});