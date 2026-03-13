import {
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { leads } from "../funnels-leads/leads";
import { evolutionInstances } from "../integrations/evolution-instances";
import { conversationStatusEnum } from "../../enums";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    evolutionInstanceId: uuid("evolution_instance_id")
      .notNull()
      .references(() => evolutionInstances.id, { onDelete: "cascade" }),
    externalId: varchar("external_id", { length: 255 }).notNull(),
    status: conversationStatusEnum("status").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, precision: 6 }),
    startedAt: timestamp("started_at", { withTimezone: true, precision: 6 }).notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true, precision: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    conversations_tenant_instance_external_unique: unique(
      "conversations_tenant_instance_external_unique"
    ).on(t.tenantId, t.evolutionInstanceId, t.externalId),
    conversations_tenant_lead_idx: index("conversations_tenant_lead_idx").on(
      t.tenantId,
      t.leadId
    ),
    conversations_tenant_status_idx: index(
      "conversations_tenant_status_idx"
    ).on(t.tenantId, t.status),
    conversations_tenant_started_idx: index(
      "conversations_tenant_started_idx"
    ).on(t.tenantId, t.startedAt),
  })
);
