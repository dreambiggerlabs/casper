import { pgTable, serial, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";

export const agent = pgTable("agent", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").defaultRandom().notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
});
