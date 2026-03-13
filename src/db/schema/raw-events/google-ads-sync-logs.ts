import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { googleAdsAccounts } from "../integrations/google-ads-accounts";

/**
 * Log de cada execução de sync Google Ads; append-only.
 */
export const googleAdsSyncLogs = pgTable(
  "google_ads_sync_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    googleAdsAccountId: uuid("google_ads_account_id")
      .notNull()
      .references(() => googleAdsAccounts.id, { onDelete: "cascade" }),
    syncStartedAt: timestamp("sync_started_at", { withTimezone: true, precision: 6 }).notNull(),
    syncFinishedAt: timestamp("sync_finished_at", { withTimezone: true, precision: 6 }),
    status: varchar("status", { length: 32 }).notNull(), // success | partial | error
    requestParams: jsonb("request_params").$type<Record<string, unknown>>(),
    responseSummary: jsonb("response_summary").$type<Record<string, unknown>>(),
    errorMessage: varchar("error_message", { length: 1024 }),
  },
  (t) => ({
    google_ads_sync_logs_tenant_started_idx: index(
      "google_ads_sync_logs_tenant_started_idx"
    ).on(t.tenantId, t.syncStartedAt),
    google_ads_sync_logs_account_started_idx: index(
      "google_ads_sync_logs_account_started_idx"
    ).on(t.googleAdsAccountId, t.syncStartedAt),
  })
);
