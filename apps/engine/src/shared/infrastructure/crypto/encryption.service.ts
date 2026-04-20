import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class EncryptionService {
  private readonly key: Buffer;

  constructor(hexKey: string) {
    let key: Buffer;
    try {
      key = Buffer.from(hexKey, "hex");
    } catch {
      throw new Error("ENCRYPTION_KEY must be a hex-encoded string.");
    }

    if (key.length !== KEY_BYTES) {
      throw new Error(
        `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). Use \`openssl rand -hex 32\`.`,
      );
    }

    this.key = key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, encrypted, tag]).toString("base64");
  }

  decrypt(blob: string): string {
    const buf = Buffer.from(blob, "base64");
    if (buf.length < IV_BYTES + TAG_BYTES) {
      throw new Error("Ciphertext is too short to be valid.");
    }

    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(buf.length - TAG_BYTES);
    const ciphertext = buf.subarray(IV_BYTES, buf.length - TAG_BYTES);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  }
}
