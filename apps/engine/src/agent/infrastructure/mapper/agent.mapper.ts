import { IriBuilder } from "@/shared/domain/iri/iri-builder.js";
import type { Agent } from "@/agent/domain/entity/agent.entity.js";
import type { agent as agentTable } from "@/agent/infrastructure/schema/agent.schema.js";

export class AgentMapper {
  constructor(private readonly iri: IriBuilder = new IriBuilder()) {}

  toEntity(row: typeof agentTable.$inferSelect): Agent {
    return {
      "@id": this.iri.build("agents", row.uuid),
      uuid: row.uuid,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
