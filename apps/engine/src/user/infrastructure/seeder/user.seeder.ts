import type { Database } from "@/shared/infrastructure/database/database-connection.js";
import type { User } from "@/user/domain/entity/user.entity.js";
import { DrizzleUserRepository } from "@/user/infrastructure/repository/drizzle-user.repository.js";

export interface UserSeedOverrides {
  name?: string;
  email?: string;
}

export class UserSeeder {
  private readonly repository: DrizzleUserRepository;
  private counter = 0;

  constructor(database: Database) {
    this.repository = new DrizzleUserRepository(database);
  }

  async create(overrides: UserSeedOverrides = {}): Promise<User> {
    this.counter += 1;
    const id = this.counter;

    return this.repository.create({
      name: overrides.name ?? `User ${id}`,
      email: overrides.email ?? `user-${id}@example.com`,
    });
  }

  reset(): void {
    this.counter = 0;
  }
}
