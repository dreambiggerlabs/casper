import { describe, it, expect } from "vitest";

import { IriParser } from "../../../src/shared/domain/iri/iri-parser.js";
import { IriSchemaFactory } from "../../../src/shared/domain/iri/iri-schema.factory.js";

const iriParser = new IriParser();
const iriSchemaFactory = new IriSchemaFactory(iriParser);

const AGENT_UUID = "550e8400-e29b-41d4-a716-446655440002";
const USER_UUID = "550e8400-e29b-41d4-a716-446655440020";

describe("IriParser.parsePolymorphic", () => {
  it("parses an agent IRI when agents is allowed", () => {
    const result = iriParser.parsePolymorphic(`/agents/${AGENT_UUID}`, [
      "agents",
      "users",
    ]);
    expect(result).toEqual({ resource: "agents", uuid: AGENT_UUID });
  });

  it("parses a user IRI when users is allowed", () => {
    const result = iriParser.parsePolymorphic(`/users/${USER_UUID}`, [
      "agents",
      "users",
    ]);
    expect(result).toEqual({ resource: "users", uuid: USER_UUID });
  });

  it("throws when resource is not in the allowed list", () => {
    expect(() =>
      iriParser.parsePolymorphic(`/projects/${AGENT_UUID}`, ["agents", "users"]),
    ).toThrow(/Invalid IRI/);
  });

  it("throws when UUID segment is malformed", () => {
    expect(() =>
      iriParser.parsePolymorphic("/agents/not-a-uuid", ["agents", "users"]),
    ).toThrow(/Invalid IRI/);
  });

  it("throws when IRI does not start with any known prefix", () => {
    expect(() =>
      iriParser.parsePolymorphic("garbage", ["agents", "users"]),
    ).toThrow(/Invalid IRI/);
  });
});

describe("IriSchemaFactory.polymorphicIri", () => {
  const schema = iriSchemaFactory.polymorphicIri(["agents", "users"]);

  it("transforms a valid agent IRI into { resource, uuid }", () => {
    const result = schema.safeParse(`/agents/${AGENT_UUID}`);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ resource: "agents", uuid: AGENT_UUID });
    }
  });

  it("transforms a valid user IRI into { resource, uuid }", () => {
    const result = schema.safeParse(`/users/${USER_UUID}`);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ resource: "users", uuid: USER_UUID });
    }
  });

  it("fails for a disallowed resource prefix", () => {
    const result = schema.safeParse(`/projects/${AGENT_UUID}`);
    expect(result.success).toBe(false);
  });

  it("fails for a malformed IRI", () => {
    const result = schema.safeParse("not-an-iri");
    expect(result.success).toBe(false);
  });
});