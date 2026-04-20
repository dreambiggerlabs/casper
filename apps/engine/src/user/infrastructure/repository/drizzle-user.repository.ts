import { eq } from "drizzle-orm";

import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import { DrizzleRepositoryBase } from "@/shared/infrastructure/repository/drizzle.repository-base.js";
import type { User } from "@/user/domain/entity/user.entity.js";
import type { CreateUser, UpdateUser } from "@/user/application/dto/user.dto.js";
import type { UserRepository } from "@/user/application/port/user.repository.js";

import { UserMapper } from "@/user/infrastructure/mapper/user.mapper.js";
import { user } from "@/user/infrastructure/schema/user.schema.js";

type UserRow = typeof user.$inferSelect;

export class DrizzleUserRepository
  extends DrizzleRepositoryBase<User, UserRow>
  implements UserRepository
{
  constructor(database: Database, mapper: UserMapper = new UserMapper()) {
    super(database, user, user.uuid, mapper);
  }

  async create(data: CreateUser): Promise<User> {
    const rows = await this.database.insert(user).values(data).returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Failed to create user");
    }

    return this.mapper.toEntity(row);
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

    return row ? this.mapper.toEntity(row) : undefined;
  }
}
