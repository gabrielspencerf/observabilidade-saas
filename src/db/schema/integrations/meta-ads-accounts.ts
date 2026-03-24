import {
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
  text,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";

/**
 * Contas de anúncio Meta (ad account); token long-lived criptografado; pixel opcional para CAPI.
 */
export const metaAdsAccounts = pgTable(
  "meta_ads_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    externalId: varchar("external_id", { length: 64 }).notNull(),
    longLivedTokenEncrypted: text("long_lived_token_encrypted").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true, precision: 6 }),
    label: varchar("label", { length: 255 }),
    currencyCode: varchar("currency_code", { length: 8 }),
    pixelId: varchar("pixel_id", { length: 64 }),
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
    meta_ads_accounts_tenant_external_unique: unique(
      "meta_ads_accounts_tenant_external_unique"
    ).on(t.tenantId, t.externalId),
    meta_ads_accounts_tenant_external_idx: index("meta_ads_accounts_tenant_external_idx").on(
      t.tenantId,
      t.externalId
    ),
  })
);
