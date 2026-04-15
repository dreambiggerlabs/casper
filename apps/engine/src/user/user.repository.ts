import { eq, count as drizzleCount } from "drizzle-orm";

import type { Database } from "../shared/database/index.js";
import { toIri } from "../shared/iri/index.js";

import { user } from "./user.schema.js";
import type {
  CreateUser,
  UpdateUser,
  User,
  UserRepository,
} from "./user.types.js";

function toUser(row: typeof user.$inferSelect): User {
  return {
    "@id": toIri("users", row.uuid),
    uuid: row.uuid,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly database: Database) {}

  async findByUuid(uuid: string): Promise<User | undefined> {
    const rows = await this.database
      .select()
      .from(user)
      .where(eq(user.uuid, uuid));
    const row = rows[0];

    return row ? toUser(row) : undefined;
  }

  async findAll(): Promise<User[]> {
    const rows = await this.database.select().from(user);

    return rows.map(toUser);
  }

  async count(): Promise<number> {
    const rows = await this.database
      .select({ count: drizzleCount() })
      .from(user);

    return rows[0]?.count ?? 0;
  }

  async findPaginated(params: {
    limit: number;
    offset: number;
  }): Promise<User[]> {
    const rows = await this.database
      .select()
      .from(user)
      .limit(params.limit)
      .offset(params.offset);

    return rows.map(toUser);
  }

  async create(data: CreateUser): Promise<User> {
    const rows = await this.database.insert(user).values(data).returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create user");
    }

    return toUser(row);
  }

  async update(uuid: string, data: UpdateUser): Promise<User | undefined> {
    const setData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) setData["name"] = data.name;
    if (data.email !== undefined) setData["email"] = data.email;

    const rows = await this.database
      .update(user)
      .set(setData)
      .where(eq(user.uuid, uuid))
      .returning();
    const row = rows[0];

    return row ? toUser(row) : undefined;
  }
}
