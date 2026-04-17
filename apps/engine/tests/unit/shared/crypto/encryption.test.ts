import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  decrypt,
  encrypt,
  resetKeyCacheForTesting,
} from "../../../../src/shared/crypto/encryption.js";

const TEST_KEY = "0".repeat(64);

describe("encryption", () => {
  let savedKey: string | undefined;

  beforeEach(() => {
    savedKey = process.env["ENCRYPTION_KEY"];
    process.env["ENCRYPTION_KEY"] = TEST_KEY;
    resetKeyCacheForTesting();
  });

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env["ENCRYPTION_KEY"];
    } else {
      process.env["ENCRYPTION_KEY"] = savedKey;
    }
    resetKeyCacheForTesting();
  });

  it("roundtrips a plaintext", () => {
    const plaintext = "ghp_supersecrettoken";
    const blob = encrypt(plaintext);
    expect(blob).not.toContain(plaintext);
    expect(decrypt(blob)).toBe(plaintext);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const plaintext = "same input";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it("rejects tampered ciphertext", () => {
    const blob = encrypt("payload");
    const buf = Buffer.from(blob, "base64");
    buf[buf.length - 1] = buf[buf.length - 1]! ^ 0xff;
    const tampered = buf.toString("base64");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("throws when ENCRYPTION_KEY is missing", () => {
    delete process.env["ENCRYPTION_KEY"];
    resetKeyCacheForTesting();
    expect(() => encrypt("anything")).toThrow(/ENCRYPTION_KEY/);
  });

  it("throws when key has wrong byte length", () => {
    process.env["ENCRYPTION_KEY"] = "abcd";
    resetKeyCacheForTesting();
    expect(() => encrypt("anything")).toThrow(/32 bytes/);
  });
});
