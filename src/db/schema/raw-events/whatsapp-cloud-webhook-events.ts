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
import { whatsappCloudNumbers } from "../integrations/whatsapp-cloud-numbers";

export const whatsappCloudWebhookEvents = pgTable(
  "whatsapp_cloud_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    whatsappCloudNumberId: uuid("whatsapp_cloud_number_id")
      .notNull()
      .references(() => whatsappCloudNumbers.id, { onDelete: "cascade" }),
    externalEventId: varchar("external_event_id", { length: 255 }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, precision: 6 }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true, precision: 6 }),
    processingError: varchar("processing_error", { length: 1024 }),
  },
  (t) => ({
    wc_webhook_events_tenant_received_idx: index(
      "wc_webhook_events_tenant_received_idx"
    ).on(t.tenantId, t.receivedAt),
    wc_webhook_events_number_received_idx: index(
      "wc_webhook_events_number_received_idx"
    ).on(t.whatsappCloudNumberId, t.receivedAt),
    wc_webhook_events_processed_idx: index(
      "wc_webhook_events_processed_idx"
    ).on(t.processedAt),
    wc_webhook_events_dedup_unique: uniqueIndex(
      "wc_webhook_events_dedup_unique"
    )
      .on(t.tenantId, t.whatsappCloudNumberId, t.externalEventId)
      .where(sql`${t.externalEventId} IS NOT NULL`),
  })
);
