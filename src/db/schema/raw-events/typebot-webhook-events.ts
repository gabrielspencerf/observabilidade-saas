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
import { typebotBots } from "../integrations/typebot-bots";

/**
 * Eventos brutos de webhook Typebot; append-only (apenas processed_at/processing_error atualizáveis).
 */
export const typebotWebhookEvents = pgTable(
  "typebot_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    typebotBotId: uuid("typebot_bot_id")
      .notNull()
      .references(() => typebotBots.id, { onDelete: "cascade" }),
    externalEventId: varchar("external_event_id", { length: 255 }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, precision: 6 }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true, precision: 6 }),
    processingError: varchar("processing_error", { length: 1024 }),
  },
  (t) => ({
    typebot_webhook_events_tenant_received_idx: index(
      "typebot_webhook_events_tenant_received_idx"
    ).on(t.tenantId, t.receivedAt),
    typebot_webhook_events_bot_received_idx: index(
      "typebot_webhook_events_bot_received_idx"
    ).on(t.typebotBotId, t.receivedAt),
    typebot_webhook_events_processed_idx: index(
      "typebot_webhook_events_processed_idx"
    ).on(t.processedAt),
    typebot_webhook_events_dedup_unique: uniqueIndex(
      "typebot_webhook_events_dedup_unique"
    )
      .on(t.tenantId, t.typebotBotId, t.externalEventId)
      .where(sql`${t.externalEventId} IS NOT NULL`),
  })
);
