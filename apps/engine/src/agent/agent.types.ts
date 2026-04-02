import type { z } from "zod";

import type { createAgentSchema } from "./agent.schema.js";

export interface Agent {
  uuid: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateAgent = z.infer<typeof createAgentSchema>;

export interface AgentReader {
  findByUuid(uuid: string): Promise<Agent | undefined>;
  findAll(): Promise<Agent[]>;
}

export interface AgentWriter {
  create(data: CreateAgent): Promise<Agent>;
}

export interface AgentRepository extends AgentReader, AgentWriter {}
