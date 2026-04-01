import { eq } from "drizzle-orm";

import type { Database } from "../shared/database/index.js";

import { projects } from "./project.schema.js";
import type {
  CreateProject,
  Project,
  ProjectRepository,
  UpdateProject,
} from "./project.types.js";

function toProject(row: typeof projects.$inferSelect): Project {
  return {
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
      .from(projects)
      .where(eq(projects.uuid, uuid));
    const row = rows[0];
    return row ? toProject(row) : undefined;
  }

  async findAll(): Promise<Project[]> {
    const rows = await this.db.select().from(projects);
    return rows.map(toProject);
  }

  async create(data: CreateProject): Promise<Project> {
    const rows = await this.db.insert(projects).values(data).returning();
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
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.uuid, uuid))
      .returning();
    const row = rows[0];
    return row ? toProject(row) : undefined;
  }
}
