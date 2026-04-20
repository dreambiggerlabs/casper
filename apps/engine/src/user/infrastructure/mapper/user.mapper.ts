import { IriBuilder } from "@/shared/domain/iri/iri-builder.js";
import type { User } from "@/user/domain/entity/user.entity.js";
import type { user as userTable } from "@/user/infrastructure/schema/user.schema.js";

export class UserMapper {
  constructor(private readonly iri: IriBuilder = new IriBuilder()) {}

  toEntity(row: typeof userTable.$inferSelect): User {
    return {
      "@id": this.iri.build("users", row.uuid),
      uuid: row.uuid,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
