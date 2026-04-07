import { randomBytes } from "crypto";

import type { Database } from "../database/index.js";

import { DrizzleProjectRepository } from "../../project/project.repository.js";
import type { Project } from "../../project/project.types.js";

import { DrizzleAgentRepository } from "../../agent/agent.repository.js";
import type { Agent } from "../../agent/agent.types.js";

import { DrizzleTaskRepository } from "../../task/task.repository.js";
import type { Task } from "../../task/task.types.js";
import type { TaskStatus } from "../../task/task.schema.js";

import {
  DrizzleWorkerRepository,
  DrizzleWorkerJobRepository,
} from "../../worker/worker.repository.js";
import type { Worker, WorkerJob } from "../../worker/worker.types.js";
import type { JobType } from "../../worker/worker.schema.js";

let counter = 0;

function nextId(): number {
  return ++counter;
}

/** Reset the auto-increment counter. Useful between test runs. */
export function resetCounter(): void {
  counter = 0;
}

export async function createProject(
  db: Database,
  overrides: { title?: string; description?: string } = {},
): Promise<Project> {
  const repo = new DrizzleProjectRepository(db);

  return repo.create({
    title: overrides.title ?? `Project ${nextId()}`,
    description: overrides.description,
  });
}

export async function createAgent(
  db: Database,
  overrides: { name?: string } = {},
): Promise<Agent> {
  const repo = new DrizzleAgentRepository(db);

  return repo.create({
    name: overrides.name ?? `Agent ${nextId()}`,
  });
}

export async function createTask(
  db: Database,
  overrides: {
    title?: string;
    projectId: string;
    parentId?: string;
    status?: TaskStatus;
    agentId?: string;
  },
): Promise<Task> {
  const repo = new DrizzleTaskRepository(db);
  const task = await repo.create({
    title: overrides.title ?? `Task ${nextId()}`,
    projectId: overrides.projectId,
    parentId: overrides.parentId,
  });

  let result = task;

  if (overrides.agentId) {
    const assigned = await repo.assign(task.uuid, overrides.agentId);
    if (assigned) result = assigned;
  }

  if (overrides.status && overrides.status !== "backlog") {
    const updated = await repo.updateStatus(result.uuid, overrides.status);
    if (updated) result = updated;
  }

  return result;
}

export async function createWorker(
  db: Database,
  overrides: { name?: string; token?: string } = {},
): Promise<Worker> {
  const repo = new DrizzleWorkerRepository(db);

  return repo.create({
    name: overrides.name ?? `Worker ${nextId()}`,
    token: overrides.token ?? randomBytes(32).toString("hex"),
  });
}

export async function createJob(
  db: Database,
  overrides: {
    workerId: string;
    type?: JobType;
    taskId?: string;
  },
): Promise<WorkerJob> {
  const repo = new DrizzleWorkerJobRepository(db);

  return repo.createJob(overrides.workerId, {
    type: overrides.type ?? "execute_task",
    taskId: overrides.taskId,
  });
}
