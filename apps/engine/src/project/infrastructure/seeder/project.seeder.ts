import type { EncryptionService } from "@/shared/infrastructure/crypto/encryption.service.js";
import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import type { Project } from "@/project/domain/entity/project.entity.js";
import { DrizzleProjectRepository } from "@/project/infrastructure/repository/drizzle-project.repository.js";

export interface ProjectSeedOverrides {
  title?: string;
  description?: string;
  repositoryUrl?: string;
}

export class ProjectSeeder {
  private readonly repository: DrizzleProjectRepository;
  private counter = 0;

  constructor(database: Database, encryption: EncryptionService) {
    this.repository = new DrizzleProjectRepository(database, encryption);
  }

  async create(overrides: ProjectSeedOverrides = {}): Promise<Project> {
    this.counter += 1;

    return this.repository.create({
      title: overrides.title ?? `Project ${this.counter}`,
      description: overrides.description,
      repositoryUrl: overrides.repositoryUrl,
    });
  }

  reset(): void {
    this.counter = 0;
  }
}
