import { IriBuilder } from "@/shared/domain/iri/iri-builder.js";
import type { Project } from "@/project/domain/entity/project.entity.js";
import type { CredentialType } from "@/project/domain/value-object/credential-type.value-object.js";
import type { project as projectTable } from "@/project/infrastructure/schema/project.schema.js";

export class ProjectMapper {
  constructor(private readonly iri: IriBuilder = new IriBuilder()) {}

  toEntity(row: typeof projectTable.$inferSelect): Project {
    return {
      "@id": this.iri.build("projects", row.uuid),
      uuid: row.uuid,
      title: row.title,
      description: row.description,
      repositoryUrl: row.repositoryUrl,
      credentialType: (row.credentialType as CredentialType | null) ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
