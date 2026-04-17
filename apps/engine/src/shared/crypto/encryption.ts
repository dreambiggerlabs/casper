import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env["ENCRYPTION_KEY"];
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32`.",
    );
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw, "hex");
  } catch {
    throw new Error("ENCRYPTION_KEY must be a hex-encoded string.");
  }

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length}). Use \`openssl rand -hex 32\`.`,
    );
  }

  cachedKey = key;

  return key;
}

export function resetKeyCacheForTesting(): void {
  cachedKey = null;
}

export function encrypt(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

export function decrypt(blob: string): string {
  const key = loadKey();
  const buf = Buffer.from(blob, "base64");
  if (buf.length < IV_BYTES + TAG_BYTES) {
    throw new Error("Ciphertext is too short to be valid.");
  }

  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(buf.length - TAG_BYTES);
  const ciphertext = buf.subarray(IV_BYTES, buf.length - TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
