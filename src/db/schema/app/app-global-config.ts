import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "../auth/users";

/**
 * Configurações globais editáveis pela web (setup).
 * Valores não sensíveis em value_plain; sensíveis em value_encrypted (criptografia AES-256-GCM com CONFIG_ENCRYPTION_KEY).
 * Nunca edita .env; apenas lido/escrito pela aplicação nesta tabela.
 */
export const appGlobalConfig = pgTable(
  "app_global_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 128 }).notNull().unique(),
    valuePlain: text("value_plain"),
    valueEncrypted: text("value_encrypted"),
    isSensitive: boolean("is_sensitive").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => ({
    app_global_config_key_idx: index("app_global_config_key_idx").on(t.key),
  })
);
