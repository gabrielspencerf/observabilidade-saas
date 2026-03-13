import { boolean, index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { integrations } from "../integrations/integrations";
import { funnels } from "../funnels-leads/funnels";
import { kpiRuleTypeEnum } from "../../enums";

export const kpiRules = pgTable(
  "kpi_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    ruleType: kpiRuleTypeEnum("rule_type").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    integrationId: uuid("integration_id").references(() => integrations.id, {
      onDelete: "set null",
    }),
    funnelId: uuid("funnel_id").references(() => funnels.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    kpi_rules_tenant_idx: index("kpi_rules_tenant_idx").on(t.tenantId),
    kpi_rules_tenant_active_idx: index("kpi_rules_tenant_active_idx").on(
      t.tenantId,
      t.isActive
    ),
  })
);
