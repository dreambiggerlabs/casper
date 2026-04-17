import {
  pgTable,
  serial,
  text,
  uuid,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const project = pgTable("project", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  repositoryUrl: varchar("repository_url", { length: 2048 }),
  credentialType: varchar("credential_type", { length: 32 }),
  credential: text("credential"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const credentialSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("https_token"),
    username: z.string().max(255).optional(),
    token: z.string().min(1).max(4096),
  }),
  z.object({
    type: z.literal("ssh_key"),
    privateKey: z.string().min(1).max(16384),
    passphrase: z.string().max(1024).optional(),
  }),
]);

export const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().nullish(),
  repositoryUrl: z.string().url().max(2048).nullish(),
  credential: credentialSchema.nullish(),
});

export const updateProjectSchema = z
  .object({
    title: z.string().min(1, "Title must not be empty").max(255).optional(),
    description: z.string().nullish(),
    repositoryUrl: z.string().url().max(2048).nullish(),
    credential: credentialSchema.nullish(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
