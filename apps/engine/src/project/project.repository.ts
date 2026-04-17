import { eq, count as drizzleCount } from "drizzle-orm";

import { decrypt, encrypt } from "../shared/crypto/index.js";
import type { Database } from "../shared/database/index.js";
import { toIri } from "../shared/iri/index.js";

import { project } from "./project.schema.js";
import type {
  CreateProject,
  CredentialType,
  Project,
  ProjectCredential,
  ProjectRepository,
  UpdateProject,
} from "./project.types.js";

function toProject(row: typeof project.$inferSelect): Project {
  return {
    "@id": toIri("projects", row.uuid),
    uuid: row.uuid,
    title: row.title,
    description: row.description,
    repositoryUrl: row.repositoryUrl,
    credentialType: (row.credentialType as CredentialType | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

interface CredentialColumns {
  credentialType: string | null;
  credential: string | null;
}

function credentialColumns(
  credential: ProjectCredential | null | undefined,
): Partial<CredentialColumns> {
  if (credential === undefined) return {};
  if (credential === null) {
    return { credentialType: null, credential: null };
  }

  return {
    credentialType: credential.type,
    credential: encrypt(JSON.stringify(credential)),
  };
}

export class DrizzleProjectRepository implements ProjectRepository {
  constructor(private readonly db: Database) {}

  async findByUuid(uuid: string): Promise<Project | undefined> {
    const rows = await this.db
      .select()
      .from(project)
      .where(eq(project.uuid, uuid));
    const row = rows[0];

    return row ? toProject(row) : undefined;
  }

  async findAll(): Promise<Project[]> {
    const rows = await this.db.select().from(project);

    return rows.map(toProject);
  }

  async count(): Promise<number> {
    const rows = await this.db.select({ count: drizzleCount() }).from(project);

    return rows[0]?.count ?? 0;
  }

  async findPaginated(params: {
    limit: number;
    offset: number;
  }): Promise<Project[]> {
    const rows = await this.db
      .select()
      .from(project)
      .limit(params.limit)
      .offset(params.offset);

    return rows.map(toProject);
  }

  async findCredential(uuid: string): Promise<ProjectCredential | null> {
    const rows = await this.db
      .select({
        credential: project.credential,
      })
      .from(project)
      .where(eq(project.uuid, uuid));
    const row = rows[0];
    if (!row || !row.credential) return null;

    return JSON.parse(decrypt(row.credential)) as ProjectCredential;
  }

  async create(data: CreateProject): Promise<Project> {
    const { credential, ...rest } = data;
    const rows = await this.db
      .insert(project)
      .values({ ...rest, ...credentialColumns(credential) })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create project");
    }

    return toProject(row);
  }

  async update(
    uuid: string,
    data: UpdateProject,
  ): Promise<Project | undefined> {
    const { credential, ...rest } = data;
    const rows = await this.db
      .update(project)
      .set({
        ...rest,
        ...credentialColumns(credential),
        updatedAt: new Date(),
      })
      .where(eq(project.uuid, uuid))
      .returning();
    const row = rows[0];

    return row ? toProject(row) : undefined;
  }
}
