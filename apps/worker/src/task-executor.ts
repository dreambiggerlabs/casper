import type { Logger } from "pino";

import type { Task } from "./types.js";

export interface TaskExecutor {
  execute(task: Task, sourcePath: string, logger: Logger): Promise<void>;
}

export class MockTaskExecutor implements TaskExecutor {
  async execute(task: Task, sourcePath: string, logger: Logger): Promise<void> {
    logger.info(
      {
        taskId: task.uuid,
        taskTitle: task.title,
        assignee: task.assignee,
        sourcePath,
      },
      "Executing task (mock)",
    );
  }
}
