import {
  date,
  index,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { googleAdsAccounts } from "../integrations/google-ads-accounts";

/**
 * Snapshots de métricas de campanhas Google Ads; granularidade inicial diária (period_start = period_end).
 */
export const campaignSnapshots = pgTable(
  "campaign_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    googleAdsAccountId: uuid("google_ads_account_id")
      .notNull()
      .references(() => googleAdsAccounts.id, { onDelete: "cascade" }),
    externalCampaignId: varchar("external_campaign_id", { length: 64 }).notNull(),
    campaignName: varchar("campaign_name", { length: 255 }).notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true, precision: 6 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    campaign_snapshots_tenant_account_campaign_period_unique: unique(
      "campaign_snapshots_tenant_account_campaign_period_unique"
    ).on(
      t.tenantId,
      t.googleAdsAccountId,
      t.externalCampaignId,
      t.periodStart
    ),
    campaign_snapshots_tenant_period_idx: index(
      "campaign_snapshots_tenant_period_idx"
    ).on(t.tenantId, t.periodStart, t.periodEnd),
    campaign_snapshots_account_period_idx: index(
      "campaign_snapshots_account_period_idx"
    ).on(t.googleAdsAccountId, t.periodStart),
  })
);
