import type { User } from "@/user/domain/entity/user.entity.js";
import type { CreateUser, UpdateUser } from "@/user/application/dto/user.dto.js";

export interface UserReader {
  findByUuid(uuid: string): Promise<User | undefined>;
  findAll(): Promise<User[]>;
  count(): Promise<number>;
  findPaginated(params: { limit: number; offset: number }): Promise<User[]>;
}

export interface UserWriter {
  create(data: CreateUser): Promise<User>;
  update(uuid: string, data: UpdateUser): Promise<User | undefined>;
}

export interface UserRepository extends UserReader, UserWriter {}
