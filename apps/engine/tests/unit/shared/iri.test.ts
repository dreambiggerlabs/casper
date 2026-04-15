import { describe, it, expect } from "vitest";

import {
  parsePolymorphicIri,
  polymorphicIriSchema,
} from "../../../src/shared/iri/index.js";

const AGENT_UUID = "550e8400-e29b-41d4-a716-446655440002";
const USER_UUID = "550e8400-e29b-41d4-a716-446655440020";

describe("parsePolymorphicIri", () => {
  it("parses an agent IRI when agents is allowed", () => {
    const result = parsePolymorphicIri(`/agents/${AGENT_UUID}`, [
      "agents",
      "users",
    ]);
    expect(result).toEqual({ resource: "agents", uuid: AGENT_UUID });
  });

  it("parses a user IRI when users is allowed", () => {
    const result = parsePolymorphicIri(`/users/${USER_UUID}`, [
      "agents",
      "users",
    ]);
    expect(result).toEqual({ resource: "users", uuid: USER_UUID });
  });

  it("throws when resource is not in the allowed list", () => {
    expect(() =>
      parsePolymorphicIri(`/projects/${AGENT_UUID}`, ["agents", "users"]),
    ).toThrow(/Invalid IRI/);
  });

  it("throws when UUID segment is malformed", () => {
    expect(() =>
      parsePolymorphicIri("/agents/not-a-uuid", ["agents", "users"]),
    ).toThrow(/Invalid IRI/);
  });

  it("throws when IRI does not start with any known prefix", () => {
    expect(() =>
      parsePolymorphicIri("garbage", ["agents", "users"]),
    ).toThrow(/Invalid IRI/);
  });
});

describe("polymorphicIriSchema", () => {
  const schema = polymorphicIriSchema(["agents", "users"]);

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
