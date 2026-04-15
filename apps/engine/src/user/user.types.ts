import type { z } from "zod";

import type { createUserSchema, updateUserSchema } from "./user.schema.js";

export interface User {
  "@id": string;
  uuid: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;

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
