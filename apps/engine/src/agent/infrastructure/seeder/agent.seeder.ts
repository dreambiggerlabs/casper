import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import type { Agent } from "@/agent/domain/entity/agent.entity.js";
import { DrizzleAgentRepository } from "@/agent/infrastructure/repository/drizzle-agent.repository.js";

export interface AgentSeedOverrides {
  name?: string;
}

export class AgentSeeder {
  private readonly repository: DrizzleAgentRepository;
  private counter = 0;

  constructor(database: Database) {
    this.repository = new DrizzleAgentRepository(database);
  }

  async create(overrides: AgentSeedOverrides = {}): Promise<Agent> {
    this.counter += 1;

    return this.repository.create({
      name: overrides.name ?? `Agent ${this.counter}`,
    });
  }

  reset(): void {
    this.counter = 0;
  }
}
