import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import type { Task } from "@/task/domain/entity/task.entity.js";
import type { AssigneeRef } from "@/task/domain/value-object/assignee.value-object.js";
import type { TaskStatus } from "@/task/domain/value-object/task-status.value-object.js";
import { DrizzleTaskRepository } from "@/task/infrastructure/repository/drizzle-task.repository.js";

export interface TaskSeedOverrides {
  title?: string;
  projectId: string;
  parentId?: string;
  status?: TaskStatus;
  assignee?: AssigneeRef;
}

export class TaskSeeder {
  private readonly repository: DrizzleTaskRepository;
  private counter = 0;

  constructor(database: Database) {
    this.repository = new DrizzleTaskRepository(database);
  }

  async create(overrides: TaskSeedOverrides): Promise<Task> {
    this.counter += 1;

    let task = await this.repository.create({
      title: overrides.title ?? `Task ${this.counter}`,
      description: null,
      projectId: overrides.projectId,
      parentId: overrides.parentId,
    });

    if (overrides.assignee) {
      const assigned = await this.repository.assign(
        task.uuid,
        overrides.assignee,
      );
      if (assigned) task = assigned;
    }

    if (overrides.status && overrides.status !== "backlog") {
      const updated = await this.repository.updateStatus(
        task.uuid,
        overrides.status,
      );
      if (updated) task = updated;
    }

    return task;
  }

  reset(): void {
    this.counter = 0;
  }
}
