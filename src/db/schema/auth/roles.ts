import { pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Papéis (super_admin, admin_tenant, operator, viewer).
 * Slug em texto único; sem enum no banco — validação na aplicação.
 */
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
});
