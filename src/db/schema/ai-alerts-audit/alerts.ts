import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { users } from "../auth/users";
import { kpiRules } from "./kpi-rules";
import { alertSeverityEnum, alertStatusEnum, alertSourceTypeEnum } from "../../enums";

/**
 * Alertas; origem genérica (source_type, source_id); kpi_rule_id preenchido quando source_type = kpi_rule.
 */
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    kpiRuleId: uuid("kpi_rule_id").references(() => kpiRules.id, { onDelete: "set null" }),
    sourceType: alertSourceTypeEnum("source_type").notNull(),
    sourceId: varchar("source_id", { length: 255 }),
    severity: alertSeverityEnum("severity").notNull(),
    status: alertStatusEnum("status").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    triggeredAt: timestamp("triggered_at", { withTimezone: true, precision: 6 }).notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true, precision: 6 }),
    acknowledgedBy: uuid("acknowledged_by").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, precision: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    alerts_tenant_triggered_idx: index("alerts_tenant_triggered_idx").on(
      t.tenantId,
      t.triggeredAt
    ),
    alerts_tenant_status_idx: index("alerts_tenant_status_idx").on(
      t.tenantId,
      t.status
    ),
    alerts_kpi_rule_idx: index("alerts_kpi_rule_idx").on(t.kpiRuleId),
  })
);
