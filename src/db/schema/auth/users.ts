import { boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Usuários globais; uma pessoa pode ter várias memberships (um por tenant).
 * Sem tenant_id; tabela global.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true, precision: 6 }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true, precision: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
