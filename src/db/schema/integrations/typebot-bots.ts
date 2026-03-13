import {
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";

/**
 * Bots Typebot; tenant_id para RLS e queries.
 */
export const typebotBots = pgTable(
  "typebot_bots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    externalId: varchar("external_id", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }),
    webhookSecretHash: varchar("webhook_secret_hash", { length: 128 }),
    webhookSecretEncrypted: varchar("webhook_secret_encrypted", { length: 1024 }),
    apiTokenEncrypted: varchar("api_token_encrypted", { length: 1024 }),
    metricsApiBaseUrl: varchar("metrics_api_base_url", { length: 512 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, precision: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    typebot_bots_tenant_external_unique: unique(
      "typebot_bots_tenant_external_unique"
    ).on(t.tenantId, t.externalId),
    typebot_bots_tenant_external_idx: index(
      "typebot_bots_tenant_external_idx"
    ).on(t.tenantId, t.externalId),
  })
);
