import type { Agent } from "@/agent/domain/entity/agent.entity.js";
import type { CreateAgent } from "@/agent/application/dto/agent.dto.js";

export interface AgentReader {
  findByUuid(uuid: string): Promise<Agent | undefined>;
  findAll(): Promise<Agent[]>;
  count(): Promise<number>;
  findPaginated(params: { limit: number; offset: number }): Promise<Agent[]>;
}

export interface AgentWriter {
  create(data: CreateAgent): Promise<Agent>;
}

export interface AgentRepository extends AgentReader, AgentWriter {}
