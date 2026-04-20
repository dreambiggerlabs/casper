import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import type { Logger } from "@/shared/infrastructure/logging/logger.js";
import type { EncryptionService } from "@/shared/infrastructure/crypto/encryption.service.js";

import { ProjectSeeder } from "@/project/infrastructure/seeder/project.seeder.js";
import { AgentSeeder } from "@/agent/infrastructure/seeder/agent.seeder.js";
import { UserSeeder } from "@/user/infrastructure/seeder/user.seeder.js";
import { TaskSeeder } from "@/task/infrastructure/seeder/task.seeder.js";
import { WorkerSeeder } from "@/worker/infrastructure/seeder/worker.seeder.js";

export class SeedOrchestrator {
  constructor(
    private readonly database: Database,
    private readonly encryption: EncryptionService,
    private readonly logger: Logger,
  ) {}

  async run(): Promise<void> {
    const projectSeeder = new ProjectSeeder(this.database, this.encryption);
    const agentSeeder = new AgentSeeder(this.database);
    const userSeeder = new UserSeeder(this.database);
    const taskSeeder = new TaskSeeder(this.database);
    const workerSeeder = new WorkerSeeder(this.database);

    this.logger.info("Seeding database...");

    const webApp = await projectSeeder.create({
      title: "Web Application",
      description: "Main customer-facing web application",
    });
    const infrastructure = await projectSeeder.create({
      title: "Infrastructure",
      description: "DevOps and platform tooling",
    });
    this.logger.info(
      { projects: [webApp.uuid, infrastructure.uuid] },
      "Created projects",
    );

    const coder = await agentSeeder.create({ name: "Coder" });
    const reviewer = await agentSeeder.create({ name: "Reviewer" });
    const devops = await agentSeeder.create({ name: "DevOps" });
    this.logger.info(
      { agents: [coder.uuid, reviewer.uuid, devops.uuid] },
      "Created agents",
    );

    const alice = await userSeeder.create({
      name: "Alice",
      email: "alice@example.com",
    });
    this.logger.info({ users: [alice.uuid] }, "Created users");

    await taskSeeder.create({
      title: "Set up authentication",
      projectId: webApp.uuid,
      assignee: { type: "agent", uuid: coder.uuid },
      status: "completed",
    });
    await taskSeeder.create({
      title: "Build user dashboard",
      projectId: webApp.uuid,
      assignee: { type: "agent", uuid: coder.uuid },
      status: "in_progress",
    });
    await taskSeeder.create({
      title: "Add email notifications",
      projectId: webApp.uuid,
      assignee: { type: "agent", uuid: coder.uuid },
      status: "ready",
    });
    await taskSeeder.create({
      title: "Review security headers",
      projectId: webApp.uuid,
      assignee: { type: "agent", uuid: reviewer.uuid },
      status: "review",
    });
    await taskSeeder.create({
      title: "Write API documentation",
      projectId: webApp.uuid,
      assignee: { type: "user", uuid: alice.uuid },
      status: "ready",
    });
    await taskSeeder.create({
      title: "Performance testing",
      projectId: webApp.uuid,
      status: "backlog",
    });

    await taskSeeder.create({
      title: "Set up CI/CD pipeline",
      projectId: infrastructure.uuid,
      assignee: { type: "agent", uuid: devops.uuid },
      status: "completed",
    });
    await taskSeeder.create({
      title: "Configure monitoring",
      projectId: infrastructure.uuid,
      assignee: { type: "agent", uuid: devops.uuid },
      status: "ready",
    });
    await taskSeeder.create({
      title: "Set up staging environment",
      projectId: infrastructure.uuid,
      assignee: { type: "agent", uuid: devops.uuid },
      status: "in_progress",
    });
    await taskSeeder.create({
      title: "Database backup automation",
      projectId: infrastructure.uuid,
      status: "backlog",
    });

    this.logger.info("Created 10 tasks across 2 projects");

    const devWorker = await workerSeeder.create({ name: "Dev Worker" });
    this.logger.info({ workerId: devWorker.uuid }, "Created worker");

    this.logger.info("Seed complete!");
  }
}
