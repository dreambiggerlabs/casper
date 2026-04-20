import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "Must be 64 hex chars (32 bytes)"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .optional(),
});

export type EnvVars = z.infer<typeof envSchema>;

export class EnvConfig {
  readonly nodeEnv: EnvVars["NODE_ENV"];
  readonly port: number;
  readonly databaseUrl: string;
  readonly encryptionKey: string;
  readonly logLevel: string;

  private constructor(parsed: EnvVars) {
    this.nodeEnv = parsed.NODE_ENV;
    this.port = parsed.PORT;
    this.databaseUrl = parsed.DATABASE_URL;
    this.encryptionKey = parsed.ENCRYPTION_KEY;
    this.logLevel =
      parsed.LOG_LEVEL ?? (parsed.NODE_ENV === "production" ? "info" : "debug");
  }

  get isProduction(): boolean {
    return this.nodeEnv === "production";
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === "development";
  }

  static load(source: NodeJS.ProcessEnv = process.env): EnvConfig {
    const parsed = envSchema.safeParse(source);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`Invalid environment configuration: ${issues}`);
    }

    return new EnvConfig(parsed.data);
  }
}
