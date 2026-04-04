import { eq, count as drizzleCount } from "drizzle-orm";

import type { Database } from "../shared/database/index.js";
import { toIri } from "../shared/iri/index.js";

import { project } from "./project.schema.js";
import type {
  CreateProject,
  Project,
  ProjectRepository,
  UpdateProject,
} from "./project.types.js";

function toProject(row: typeof project.$inferSelect): Project {
  return {
    "@id": toIri("projects", row.uuid),
    uuid: row.uuid,
    title: row.title,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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
    const rows = await this.db
      .select({ count: drizzleCount() })
      .from(project);
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

  async create(data: CreateProject): Promise<Project> {
    const rows = await this.db.insert(project).values(data).returning();
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
    const rows = await this.db
      .update(project)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(project.uuid, uuid))
      .returning();
    const row = rows[0];
    return row ? toProject(row) : undefined;
  }
}
