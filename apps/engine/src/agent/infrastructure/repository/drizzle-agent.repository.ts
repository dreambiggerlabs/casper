import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import { DrizzleRepositoryBase } from "@/shared/infrastructure/repository/drizzle.repository-base.js";
import type { Agent } from "@/agent/domain/entity/agent.entity.js";
import type { CreateAgent } from "@/agent/application/dto/agent.dto.js";
import type { AgentRepository } from "@/agent/application/port/agent.repository.js";

import { AgentMapper } from "@/agent/infrastructure/mapper/agent.mapper.js";
import { agent } from "@/agent/infrastructure/schema/agent.schema.js";

type AgentRow = typeof agent.$inferSelect;

export class DrizzleAgentRepository
  extends DrizzleRepositoryBase<Agent, AgentRow>
  implements AgentRepository
{
  constructor(database: Database, mapper: AgentMapper = new AgentMapper()) {
    super(database, agent, agent.uuid, mapper);
  }

  async create(data: CreateAgent): Promise<Agent> {
    const rows = await this.database.insert(agent).values(data).returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create agent");
    }

    return this.mapper.toEntity(row);
  }
}
