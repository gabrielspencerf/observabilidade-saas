import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";
import { tenants } from "./tenants";

/**
 * Sessão server-side; apenas hash do token opaco é armazenado (nunca o token bruto).
 * current_tenant_id = contexto de uso; troca de tenant não altera tabelas de domínio.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currentTenantId: uuid("current_tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    /** Hash do token opaco (ex.: SHA-256 em hex). Token bruto nunca é persistido. */
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
    expiresAt: timestamp("expires_at", { withTimezone: true, precision: 6 }).notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    sessions_token_hash_idx: index("sessions_token_hash_idx").on(t.tokenHash),
    sessions_user_id_idx: index("sessions_user_id_idx").on(t.userId),
    sessions_expires_at_idx: index("sessions_expires_at_idx").on(t.expiresAt),
  })
);
