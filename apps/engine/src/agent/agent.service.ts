import {
  NotFoundError,
  ValidationError,
  zodIssuesToViolations,
} from "../shared/errors/index.js";

import type {
  PaginatedResult,
  PaginationParams,
} from "../shared/pagination/index.js";

import { createAgentSchema } from "./agent.schema.js";
import type { Agent, AgentRepository } from "./agent.types.js";

export class AgentService {
  constructor(private readonly agentRepository: AgentRepository) {}

  async createAgent(input: unknown): Promise<Agent> {
    const parsed = createAgentSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    return this.agentRepository.create(parsed.data);
  }

  async getAgent(uuid: string): Promise<Agent> {
    const agent = await this.agentRepository.findByUuid(uuid);
    if (!agent) {
      throw new NotFoundError("Agent", uuid);
    }

    return agent;
  }

  async listAgents(
    pagination: PaginationParams,
  ): Promise<PaginatedResult<Agent>> {
    const offset = (pagination.page - 1) * pagination.itemsPerPage;
    const [items, totalItems] = await Promise.all([
      this.agentRepository.findPaginated({
        limit: pagination.itemsPerPage,
        offset,
      }),
      this.agentRepository.count(),
    ]);

    return { items, totalItems };
  }
}
