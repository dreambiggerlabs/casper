import type { Database } from "../../src/shared/infrastructure/database/database-connection.js";
import type { Project } from "../../src/project/domain/entity/project.entity.js";
import type { Agent } from "../../src/agent/domain/entity/agent.entity.js";
import type { User } from "../../src/user/domain/entity/user.entity.js";
import type { Task } from "../../src/task/domain/entity/task.entity.js";
import type { AssigneeRef } from "../../src/task/domain/value-object/assignee.value-object.js";
import type { TaskStatus } from "../../src/task/domain/value-object/task-status.value-object.js";
import type { Worker } from "../../src/worker/domain/entity/worker.entity.js";
import type { WorkerJob } from "../../src/worker/domain/entity/worker-job.entity.js";
import type { JobType } from "../../src/worker/domain/value-object/job-type.value-object.js";

import { ProjectSeeder } from "../../src/project/infrastructure/seeder/project.seeder.js";
import { AgentSeeder } from "../../src/agent/infrastructure/seeder/agent.seeder.js";
import { UserSeeder } from "../../src/user/infrastructure/seeder/user.seeder.js";
import { TaskSeeder } from "../../src/task/infrastructure/seeder/task.seeder.js";
import { WorkerSeeder } from "../../src/worker/infrastructure/seeder/worker.seeder.js";
import { WorkerJobSeeder } from "../../src/worker/infrastructure/seeder/worker-job.seeder.js";
import { EncryptionService } from "../../src/shared/infrastructure/crypto/encryption.service.js";

let encryption: EncryptionService | undefined;

function getEncryption(): EncryptionService {
  if (!encryption) {
    encryption = new EncryptionService(
      process.env["ENCRYPTION_KEY"] ??
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    );
  }

  return encryption;
}

export async function createTestProject(
  db: Database,
  overrides: {
    title?: string;
    description?: string;
    repositoryUrl?: string;
  } = {},
): Promise<Project> {
  const seeder = new ProjectSeeder(db, getEncryption());

  return seeder.create(overrides);
}

export async function createTestAgent(
  db: Database,
  overrides: { name?: string } = {},
): Promise<Agent> {
  const seeder = new AgentSeeder(db);

  return seeder.create(overrides);
}

export async function createTestUser(
  db: Database,
  overrides: { name?: string; email?: string } = {},
): Promise<User> {
  const seeder = new UserSeeder(db);

  return seeder.create(overrides);
}

export async function createTestTask(
  db: Database,
  overrides: {
    title?: string;
    projectId: string;
    parentId?: string;
    status?: TaskStatus;
    assignee?: AssigneeRef;
  },
): Promise<Task> {
  const seeder = new TaskSeeder(db);

  return seeder.create(overrides);
}

export async function createTestWorker(
  db: Database,
  overrides: { name?: string; token?: string } = {},
): Promise<Worker> {
  const seeder = new WorkerSeeder(db);

  return seeder.create(overrides);
}

export async function createTestJob(
  db: Database,
  overrides: {
    workerId: string;
    type?: JobType;
    taskId?: string;
  },
): Promise<WorkerJob> {
  const seeder = new WorkerJobSeeder(db);

  return seeder.create(overrides);
}

export function resetFixtureCounter(): void {
  // Seeders manage their own counters; reset is a no-op at this level.
  // Individual seeder.reset() can be called if needed.
}