import { describe, it, expect, vi } from "vitest";
import type { Logger } from "pino";

import { MockTaskExecutor } from "../../src/task-executor.js";

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger;
}

describe("MockTaskExecutor", () => {
  it("resolves and logs task details", async () => {
    const executor = new MockTaskExecutor();
    const logger = createMockLogger();

    await expect(
      executor.execute(
        {
          uuid: "task-1",
          title: "Test Task",
          description: null,
          project: "/projects/project-1",
          status: "in_progress",
          assignee: "/agents/agent-1",
        },
        "/home/test/.casper/projects/project-1/source",
        logger,
      ),
    ).resolves.toBeUndefined();

    expect(logger.info).toHaveBeenCalledWith(
      {
        taskId: "task-1",
        taskTitle: "Test Task",
        assignee: "/agents/agent-1",
        sourcePath: "/home/test/.casper/projects/project-1/source",
      },
      "Executing task (mock)",
    );
  });
});
