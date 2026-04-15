import {
  NotFoundError,
  ValidationError,
  zodIssuesToViolations,
} from "../shared/errors/index.js";

import type {
  PaginatedResult,
  PaginationParams,
} from "../shared/pagination/index.js";

import { createUserSchema, updateUserSchema } from "./user.schema.js";
import type { User, UserRepository } from "./user.types.js";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(input: unknown): Promise<User> {
    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    return this.userRepository.create(parsed.data);
  }

  async getUser(uuid: string): Promise<User> {
    const user = await this.userRepository.findByUuid(uuid);
    if (!user) {
      throw new NotFoundError("User", uuid);
    }

    return user;
  }

  async listUsers(
    pagination: PaginationParams,
  ): Promise<PaginatedResult<User>> {
    const offset = (pagination.page - 1) * pagination.itemsPerPage;
    const [items, totalItems] = await Promise.all([
      this.userRepository.findPaginated({
        limit: pagination.itemsPerPage,
        offset,
      }),
      this.userRepository.count(),
    ]);

    return { items, totalItems };
  }

  async updateUser(uuid: string, input: unknown): Promise<User> {
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      const violations = zodIssuesToViolations(parsed.error.issues);
      throw new ValidationError("Validation failed", violations);
    }

    const updated = await this.userRepository.update(uuid, parsed.data);
    if (!updated) {
      throw new NotFoundError("User", uuid);
    }

    return updated;
  }
}
