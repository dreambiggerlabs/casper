import { describe, expect, it } from "vitest";

import { EncryptionService } from "../../../../src/shared/infrastructure/crypto/encryption.service.js";

const TEST_KEY = "0".repeat(64);

describe("EncryptionService", () => {
  const encryption = new EncryptionService(TEST_KEY);

  it("roundtrips a plaintext", () => {
    const plaintext = "ghp_supersecrettoken";
    const blob = encryption.encrypt(plaintext);
    expect(blob).not.toContain(plaintext);
    expect(encryption.decrypt(blob)).toBe(plaintext);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const plaintext = "same input";
    const a = encryption.encrypt(plaintext);
    const b = encryption.encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it("rejects tampered ciphertext", () => {
    const blob = encryption.encrypt("payload");
    const buf = Buffer.from(blob, "base64");
    buf[buf.length - 1] = buf[buf.length - 1]! ^ 0xff;
    const tampered = buf.toString("base64");
    expect(() => encryption.decrypt(tampered)).toThrow();
  });

  it("throws when key has wrong byte length", () => {
    expect(() => new EncryptionService("abcd")).toThrow(/32 bytes/);
  });
})