import { eq } from "drizzle-orm";

import type { Database } from "../shared/database/index.js";
import { toIri } from "../shared/iri/index.js";

import { agent } from "./agent.schema.js";
import type { Agent, AgentRepository, CreateAgent } from "./agent.types.js";

function toAgent(row: typeof agent.$inferSelect): Agent {
  return {
    "@id": toIri("agents", row.uuid),
    uuid: row.uuid,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleAgentRepository implements AgentRepository {
  constructor(private readonly database: Database) {}

  async findByUuid(uuid: string): Promise<Agent | undefined> {
    const rows = await this.database
      .select()
      .from(agent)
      .where(eq(agent.uuid, uuid));
    const row = rows[0];
    return row ? toAgent(row) : undefined;
  }

  async findAll(): Promise<Agent[]> {
    const rows = await this.database.select().from(agent);
    return rows.map(toAgent);
  }

  async create(data: CreateAgent): Promise<Agent> {
    const rows = await this.database.insert(agent).values(data).returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create agent");
    }
    return toAgent(row);
  }
}
