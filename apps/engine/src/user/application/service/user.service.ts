import { NotFoundError } from "@/shared/domain/error/not-found.error.js";
import { ValidationError } from "@/shared/domain/error/validation.error.js";
import type {
  PaginatedResult,
  PaginationParams,
} from "@/shared/domain/value-object/pagination.value-object.js";
import type { User } from "@/user/domain/entity/user.entity.js";
import type { UserRepository } from "@/user/application/port/user.repository.js";

import { UserDto } from "@/user/application/dto/user.dto.js";

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(input: unknown): Promise<User> {
    const parsed = UserDto.create.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
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
    const parsed = UserDto.update.safeParse(input);
    if (!parsed.success) {
      throw ValidationError.fromZodIssues(parsed.error.issues);
    }

    const updated = await this.userRepository.update(uuid, parsed.data);
    if (!updated) {
      throw new NotFoundError("User", uuid);
    }

    return updated;
  }
}
