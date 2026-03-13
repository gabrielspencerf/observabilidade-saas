import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "../auth/tenants";
import { evolutionInstances } from "../integrations/evolution-instances";

/**
 * Eventos brutos de webhook Evolution; append-only (apenas processed_at/processing_error atualizáveis).
 */
export const evolutionWebhookEvents = pgTable(
  "evolution_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    evolutionInstanceId: uuid("evolution_instance_id")
      .notNull()
      .references(() => evolutionInstances.id, { onDelete: "cascade" }),
    externalEventId: varchar("external_event_id", { length: 255 }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, precision: 6 }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true, precision: 6 }),
    processingError: varchar("processing_error", { length: 1024 }),
  },
  (t) => ({
    evolution_webhook_events_tenant_received_idx: index(
      "evolution_webhook_events_tenant_received_idx"
    ).on(t.tenantId, t.receivedAt),
    evolution_webhook_events_instance_received_idx: index(
      "evolution_webhook_events_instance_received_idx"
    ).on(t.evolutionInstanceId, t.receivedAt),
    evolution_webhook_events_processed_idx: index(
      "evolution_webhook_events_processed_idx"
    ).on(t.processedAt),
    evolution_webhook_events_dedup_unique: uniqueIndex(
      "evolution_webhook_events_dedup_unique"
    )
      .on(t.tenantId, t.evolutionInstanceId, t.externalEventId)
      .where(sql`${t.externalEventId} IS NOT NULL`),
  })
);
