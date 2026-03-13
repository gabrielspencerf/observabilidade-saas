import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Permissões granulares (ex.: leads:read, funnels:write).
 * Catálogo global; sem tenant_id.
 */
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  resource: varchar("resource", { length: 64 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
});
