import { eq } from "drizzle-orm";

import type { EncryptionService } from "@/shared/infrastructure/crypto/encryption.service.js";
import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import { DrizzleRepositoryBase } from "@/shared/infrastructure/repository/drizzle.repository-base.js";
import type { Project } from "@/project/domain/entity/project.entity.js";
import type { ProjectCredential } from "@/project/domain/value-object/credential-type.value-object.js";
import type {
  CreateProject,
  UpdateProject,
} from "@/project/application/dto/project.dto.js";
import type { ProjectRepository } from "@/project/application/port/project.repository.js";

import { ProjectMapper } from "@/project/infrastructure/mapper/project.mapper.js";
import { project } from "@/project/infrastructure/schema/project.schema.js";

type ProjectRow = typeof project.$inferSelect;

interface CredentialColumns {
  credentialType: string | null;
  credential: string | null;
}

export class DrizzleProjectRepository
  extends DrizzleRepositoryBase<Project, ProjectRow>
  implements ProjectRepository
{
  constructor(
    database: Database,
    private readonly encryption: EncryptionService,
    mapper: ProjectMapper = new ProjectMapper(),
  ) {
    super(database, project, project.uuid, mapper);
  }

  async findCredential(uuid: string): Promise<ProjectCredential | null> {
    const rows = await this.database
      .select({ credential: project.credential })
      .from(project)
      .where(eq(project.uuid, uuid));
    const row = rows[0];
    if (!row || !row.credential) return null;

    return JSON.parse(
      this.encryption.decrypt(row.credential),
    ) as ProjectCredential;
  }

  async create(data: CreateProject): Promise<Project> {
    const { credential, ...rest } = data;
    const rows = await this.database
      .insert(project)
      .values({ ...rest, ...this.credentialColumns(credential) })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create project");
    }

    return this.mapper.toEntity(row);
  }

  async update(
    uuid: string,
    data: UpdateProject,
  ): Promise<Project | undefined> {
    const { credential, ...rest } = data;
    const rows = await this.database
      .update(project)
      .set({
        ...rest,
        ...this.credentialColumns(credential),
        updatedAt: new Date(),
      })
      .where(eq(project.uuid, uuid))
      .returning();
    const row = rows[0];

    return row ? this.mapper.toEntity(row) : undefined;
  }

  private credentialColumns(
    credential: ProjectCredential | null | undefined,
  ): Partial<CredentialColumns> {
    if (credential === undefined) return {};
    if (credential === null) {
      return { credentialType: null, credential: null };
    }

    return {
      credentialType: credential.type,
      credential: this.encryption.encrypt(JSON.stringify(credential)),
    };
  }
}
