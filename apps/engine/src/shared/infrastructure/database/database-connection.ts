import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type Database = ReturnType<typeof drizzle>;

export class DatabaseConnection {
  private readonly client: postgres.Sql;
  readonly db: Database;

  constructor(databaseUrl: string) {
    this.client = postgres(databaseUrl);
    this.db = drizzle(this.client);
  }

  async close(): Promise<void> {
    await this.client.end();
  }
}
