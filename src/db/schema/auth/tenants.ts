import { boolean, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Tenants (organizações/clientes) — raiz do multi-tenant.
 * Sem tenant_id; tabela global.
 */
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  settings: jsonb("settings").$type<Record<string, unknown>>(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
