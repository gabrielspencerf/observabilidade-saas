import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";

export const chatwootAccounts = pgTable(
  "chatwoot_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    externalId: varchar("external_id", { length: 64 }).notNull(),
    baseUrl: varchar("base_url", { length: 512 }).notNull(),
    apiTokenEncrypted: text("api_token_encrypted"),
    inboxId: varchar("inbox_id", { length: 64 }),
    label: varchar("label", { length: 255 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, precision: 6 }),
    lastSyncError: varchar("last_sync_error", { length: 1024 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    chatwoot_accounts_tenant_external_unique: unique(
      "chatwoot_accounts_tenant_external_unique"
    ).on(t.tenantId, t.externalId),
    chatwoot_accounts_tenant_external_idx: index(
      "chatwoot_accounts_tenant_external_idx"
    ).on(t.tenantId, t.externalId),
  })
);
