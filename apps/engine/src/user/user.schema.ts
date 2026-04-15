import { pgTable, serial, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const user = pgTable("user", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Must be a valid email").max(255),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1, "Name must not be empty").max(255).optional(),
    email: z.string().email("Must be a valid email").max(255).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
