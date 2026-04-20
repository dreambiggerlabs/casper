import { NotFoundError } from "@/shared/domain/error/not-found.error.js";
import { ValidationError } from "@/shared/domain/error/validation.error.js";
import type {
  PaginatedResult,
  PaginationParams,
} from "@/shared/domain/value-object/pagination.value-object.js";
import type { Agent } from "@/agent/domain/entity/agent.entity.js";
import type { AgentRepository } from "@/agent/application/port/agent.repository.js";

import { AgentDto } from "@/agent/application/dto/agent.dto.js";

export class AgentService {
  constructor(private readonly agentRepository: AgentRepository) {}

  async createAgent(input: unknown): Promise<Agent> {
    const parsed = AgentDto.create.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
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
