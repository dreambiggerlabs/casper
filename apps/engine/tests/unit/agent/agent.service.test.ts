import { describe, it, expect, vi } from "vitest";

import { NotFoundError, ValidationError } from "../../../src/shared/errors/index.js";

import { AgentService } from "../../../src/agent/agent.service.js";
import type { AgentRepository, Agent } from "../../../src/agent/agent.types.js";

function createMockAgentRepository(): AgentRepository {
  return {
    findByUuid: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
  };
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  const uuid = overrides.uuid ?? "550e8400-e29b-41d4-a716-446655440002";
  return {
    "@id": `/agents/${uuid}`,
    uuid,
    name: "Test Agent",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("AgentService", () => {
  describe("createAgent", () => {
    it("should create an agent when valid data is provided", async () => {
      const agentRepository = createMockAgentRepository();
      const expectedAgent = makeAgent({ name: "My Agent" });

      vi.mocked(agentRepository.create).mockResolvedValue(expectedAgent);

      const service = new AgentService(agentRepository);
      const result = await service.createAgent({ name: "My Agent" });

      expect(result).toEqual(expectedAgent);
      expect(agentRepository.create).toHaveBeenCalledWith({ name: "My Agent" });
    });

    it("should throw ValidationError when name is missing", async () => {
      const service = new AgentService(createMockAgentRepository());

      await expect(service.createAgent({})).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError when name is empty string", async () => {
      const service = new AgentService(createMockAgentRepository());

      await expect(service.createAgent({ name: "" })).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("getAgent", () => {
    it("should return an agent when it exists", async () => {
      const agentRepository = createMockAgentRepository();
      const expected = makeAgent();
      vi.mocked(agentRepository.findByUuid).mockResolvedValue(expected);

      const service = new AgentService(agentRepository);
      const result = await service.getAgent(expected.uuid);

      expect(result).toEqual(expected);
    });

    it("should throw NotFoundError when agent does not exist", async () => {
      const agentRepository = createMockAgentRepository();
      vi.mocked(agentRepository.findByUuid).mockResolvedValue(undefined);

      const service = new AgentService(agentRepository);

      await expect(service.getAgent("nonexistent")).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("listAgents", () => {
    it("should return all agents", async () => {
      const agentRepository = createMockAgentRepository();
      const expected = [makeAgent(), makeAgent({ uuid: "other-uuid" })];
      vi.mocked(agentRepository.findAll).mockResolvedValue(expected);

      const service = new AgentService(agentRepository);
      const result = await service.listAgents();

      expect(result).toEqual(expected);
    });
  });
});
