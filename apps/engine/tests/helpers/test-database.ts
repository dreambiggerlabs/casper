import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";
import { fileURLToPath } from "url";
import { sql } from "drizzle-orm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../../drizzle");

/**
 * Resolves the test database URL.
 * Priority: DATABASE_TEST_URL > derived from DATABASE_URL > localhost fallback.
 * When running inside docker, DATABASE_URL points to database:5432.
 */
export function getTestDatabaseUrl(): string {
  if (process.env["DATABASE_TEST_URL"]) {
    return process.env["DATABASE_TEST_URL"];
  }

  // Derive from DATABASE_URL (works both in docker and locally)
  const baseUrl = process.env["DATABASE_URL"];
  if (baseUrl) {
    const url = new URL(baseUrl);
    url.pathname = "/casper_test";
    return url.toString();
  }

  // Fallback for local development without docker
  return "postgresql://casper:casper@localhost:5440/casper_test";
}

export async function ensureTestDatabase(): Promise<void> {
  const testUrl = getTestDatabaseUrl();
  const url = new URL(testUrl);
  const dbName = url.pathname.slice(1); // remove leading /

  // Connect to the default 'postgres' database to create our test db
  url.pathname = "/postgres";
  const adminClient = postgres(url.toString(), { max: 1 });

  try {
    const rows = await adminClient`
      SELECT 1 FROM pg_database WHERE datname = ${dbName}
    `;
    if (rows.length === 0) {
      await adminClient.unsafe(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await adminClient.end();
  }
}

export async function createTestDatabase() {
  const testUrl = getTestDatabaseUrl();
  const client = postgres(testUrl);
  const db = drizzle(client);

  return { db, client };
}

export async function migrateTestDatabase(
  db: ReturnType<typeof drizzle>,
): Promise<void> {
  await migrate(db, { migrationsFolder });
}

export async function truncateAllTables(
  db: ReturnType<typeof drizzle>,
): Promise<void> {
  await db.execute(
    sql`TRUNCATE worker_job, task, agent, worker, project RESTART IDENTITY CASCADE`,
  );
}

export async function closeTestDatabase(client: postgres.Sql): Promise<void> {
  await client.end();
}
