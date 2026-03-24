import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Tokens de redefinicao de senha (single-use).
 * Apenas hash do token e armazenado no banco.
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, precision: 6 }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true, precision: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    prt_token_hash_idx: index("prt_token_hash_idx").on(t.tokenHash),
    prt_user_id_idx: index("prt_user_id_idx").on(t.userId),
    prt_expires_at_idx: index("prt_expires_at_idx").on(t.expiresAt),
  })
);
