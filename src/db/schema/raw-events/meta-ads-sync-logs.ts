import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { metaAdsAccounts } from "../integrations/meta-ads-accounts";

export const metaAdsSyncLogs = pgTable(
  "meta_ads_sync_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    metaAdsAccountId: uuid("meta_ads_account_id")
      .notNull()
      .references(() => metaAdsAccounts.id, { onDelete: "cascade" }),
    syncStartedAt: timestamp("sync_started_at", { withTimezone: true, precision: 6 }).notNull(),
    syncFinishedAt: timestamp("sync_finished_at", { withTimezone: true, precision: 6 }),
    status: varchar("status", { length: 32 }).notNull(),
    requestParams: jsonb("request_params").$type<Record<string, unknown>>(),
    responseSummary: jsonb("response_summary").$type<Record<string, unknown>>(),
    errorMessage: varchar("error_message", { length: 1024 }),
  },
  (t) => ({
    meta_ads_sync_logs_tenant_started_idx: index("meta_ads_sync_logs_tenant_started_idx").on(
      t.tenantId,
      t.syncStartedAt
    ),
    meta_ads_sync_logs_account_started_idx: index("meta_ads_sync_logs_account_started_idx").on(
      t.metaAdsAccountId,
      t.syncStartedAt
    ),
  })
);
