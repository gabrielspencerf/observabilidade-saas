import {
  date,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { funnels } from "../funnels-leads/funnels";
import { funnelSteps } from "../funnels-leads/funnel-steps";

/**
 * Métricas de funil por etapa e período; granularidade inicial diária.
 */
export const funnelStepMetricsSnapshot = pgTable(
  "funnel_step_metrics_snapshot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    funnelStepId: uuid("funnel_step_id")
      .notNull()
      .references(() => funnelSteps.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    leadsEntered: integer("leads_entered").notNull().default(0),
    leadsExited: integer("leads_exited").notNull().default(0),
    leadsConverted: integer("leads_converted").notNull().default(0),
    conversionRate: numeric("conversion_rate", { precision: 5, scale: 4 }),
    syncedAt: timestamp("synced_at", { withTimezone: true, precision: 6 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    funnel_step_metrics_snapshot_tenant_funnel_step_period_unique: unique(
      "funnel_step_metrics_snapshot_tenant_funnel_step_period_unique"
    ).on(t.tenantId, t.funnelId, t.funnelStepId, t.periodStart),
    funnel_step_metrics_snapshot_tenant_funnel_period_idx: index(
      "funnel_step_metrics_snapshot_tenant_funnel_period_idx"
    ).on(t.tenantId, t.funnelId, t.periodStart),
    funnel_step_metrics_snapshot_funnel_period_idx: index(
      "funnel_step_metrics_snapshot_funnel_period_idx"
    ).on(t.funnelId, t.periodStart),
  })
);
