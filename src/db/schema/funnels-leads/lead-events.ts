import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { leads } from "./leads";
import { funnelSteps } from "./funnel-steps";
import { integrations } from "../integrations/integrations";

/**
 * Eventos na jornada do lead; append-only.
 */
export const leadEvents = pgTable(
  "lead_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    funnelStepId: uuid("funnel_step_id").references(() => funnelSteps.id, {
      onDelete: "set null",
    }),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, precision: 6 }).notNull(),
    sourceIntegrationId: uuid("source_integration_id").references(() => integrations.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    lead_events_lead_occurred_idx: index(
      "lead_events_lead_occurred_idx"
    ).on(t.leadId, t.occurredAt),
    lead_events_tenant_occurred_idx: index(
      "lead_events_tenant_occurred_idx"
    ).on(t.tenantId, t.occurredAt),
    lead_events_lead_type_idx: index("lead_events_lead_type_idx").on(
      t.leadId,
      t.eventType
    ),
  })
);
