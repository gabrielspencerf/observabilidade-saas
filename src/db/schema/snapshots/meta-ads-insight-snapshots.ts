import {
  date,
  index,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { metaAdsAccounts } from "../integrations/meta-ads-accounts";

/**
 * Insights diários agregados ao nível da conta (Marketing API).
 */
export const metaAdsInsightSnapshots = pgTable(
  "meta_ads_insight_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    metaAdsAccountId: uuid("meta_ads_account_id")
      .notNull()
      .references(() => metaAdsAccounts.id, { onDelete: "cascade" }),
    insightDate: date("insight_date").notNull(),
    metrics: jsonb("metrics").$type<Record<string, unknown>>().notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true, precision: 6 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    meta_ads_insight_snapshots_unique_day: unique("meta_ads_insight_snapshots_unique_day").on(
      t.tenantId,
      t.metaAdsAccountId,
      t.insightDate
    ),
    meta_ads_insight_snapshots_tenant_date_idx: index(
      "meta_ads_insight_snapshots_tenant_date_idx"
    ).on(t.tenantId, t.insightDate),
  })
);
