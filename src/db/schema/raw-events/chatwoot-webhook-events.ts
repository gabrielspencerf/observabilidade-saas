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
import { chatwootAccounts } from "../integrations/chatwoot-accounts";

export const chatwootWebhookEvents = pgTable(
  "chatwoot_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    chatwootAccountId: uuid("chatwoot_account_id")
      .notNull()
      .references(() => chatwootAccounts.id, { onDelete: "cascade" }),
    externalEventId: varchar("external_event_id", { length: 255 }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, precision: 6 }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true, precision: 6 }),
    processingError: varchar("processing_error", { length: 1024 }),
  },
  (t) => ({
    chatwoot_webhook_events_tenant_received_idx: index(
      "chatwoot_webhook_events_tenant_received_idx"
    ).on(t.tenantId, t.receivedAt),
    chatwoot_webhook_events_account_received_idx: index(
      "chatwoot_webhook_events_account_received_idx"
    ).on(t.chatwootAccountId, t.receivedAt),
    chatwoot_webhook_events_processed_idx: index(
      "chatwoot_webhook_events_processed_idx"
    ).on(t.processedAt),
    chatwoot_webhook_events_dedup_unique: uniqueIndex(
      "chatwoot_webhook_events_dedup_unique"
    )
      .on(t.tenantId, t.chatwootAccountId, t.externalEventId)
      .where(sql`${t.externalEventId} IS NOT NULL`),
  })
);
