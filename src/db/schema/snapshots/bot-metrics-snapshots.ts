import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { typebotBots } from "../integrations/typebot-bots";

/**
 * Snapshots de métricas por bot Typebot; granularidade inicial diária.
 */
export const botMetricsSnapshots = pgTable(
  "bot_metrics_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    typebotBotId: uuid("typebot_bot_id")
      .notNull()
      .references(() => typebotBots.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    sessionsStarted: integer("sessions_started").notNull().default(0),
    sessionsCompleted: integer("sessions_completed").notNull().default(0),
    sessionsAbandoned: integer("sessions_abandoned").notNull().default(0),
    stepMetrics: jsonb("step_metrics").$type<Record<string, unknown>>(),
    syncedAt: timestamp("synced_at", { withTimezone: true, precision: 6 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    bot_metrics_snapshots_tenant_bot_period_unique: unique(
      "bot_metrics_snapshots_tenant_bot_period_unique"
    ).on(t.tenantId, t.typebotBotId, t.periodStart),
    bot_metrics_snapshots_tenant_period_idx: index(
      "bot_metrics_snapshots_tenant_period_idx"
    ).on(t.tenantId, t.periodStart),
    bot_metrics_snapshots_bot_period_idx: index(
      "bot_metrics_snapshots_bot_period_idx"
    ).on(t.typebotBotId, t.periodStart),
  })
);
