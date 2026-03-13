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
 * Contas Google Ads; tenant_id presente para RLS, queries e segurança defensiva.
 */
export const googleAdsAccounts = pgTable(
  "google_ads_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    externalId: varchar("external_id", { length: 64 }).notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted").notNull(),
    accessTokenEncrypted: text("access_token_encrypted"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true, precision: 6 }),
    label: varchar("label", { length: 255 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, precision: 6 }),
    lastSyncError: varchar("last_sync_error", { length: 1024 }),
    currencyCode: varchar("currency_code", { length: 8 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    google_ads_accounts_tenant_external_unique: unique(
      "google_ads_accounts_tenant_external_unique"
    ).on(t.tenantId, t.externalId),
    google_ads_accounts_tenant_external_idx: index(
      "google_ads_accounts_tenant_external_idx"
    ).on(t.tenantId, t.externalId),
  })
);
