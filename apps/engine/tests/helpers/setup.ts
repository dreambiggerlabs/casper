import {
  ensureTestDatabase,
  createTestDatabase,
  migrateTestDatabase,
  closeTestDatabase,
} from "./test-database.js";

export async function setup(): Promise<void> {
  await ensureTestDatabase();

  const { db, client } = await createTestDatabase();
  await migrateTestDatabase(db);
  await closeTestDatabase(client);
}
