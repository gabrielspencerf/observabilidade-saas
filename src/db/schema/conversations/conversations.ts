import {
  check,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "../auth/tenants";
import { leads } from "../funnels-leads/leads";
import { evolutionInstances } from "../integrations/evolution-instances";
import { uazapiInstances } from "../integrations/uazapi-instances";
import { chatwootAccounts } from "../integrations/chatwoot-accounts";
import { whatsappCloudNumbers } from "../integrations/whatsapp-cloud-numbers";
import { conversationStatusEnum } from "../../enums";
import { contacts } from "../contacts";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    evolutionInstanceId: uuid("evolution_instance_id").references(
      () => evolutionInstances.id,
      { onDelete: "cascade" }
    ),
    uazapiInstanceId: uuid("uazapi_instance_id").references(
      () => uazapiInstances.id,
      { onDelete: "cascade" }
    ),
    chatwootAccountId: uuid("chatwoot_account_id").references(
      () => chatwootAccounts.id,
      { onDelete: "cascade" }
    ),
    whatsappCloudNumberId: uuid("whatsapp_cloud_number_id").references(
      () => whatsappCloudNumbers.id,
      { onDelete: "cascade" }
    ),
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
    conversations_instance_check: check(
      "conversations_instance_check",
      sql`num_nonnulls(${t.evolutionInstanceId}, ${t.uazapiInstanceId}, ${t.chatwootAccountId}, ${t.whatsappCloudNumberId}) = 1`
    ),
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
    conversations_tenant_evolution_external_unique: uniqueIndex(
      "conversations_tenant_evolution_external_unique"
    )
      .on(t.tenantId, t.evolutionInstanceId, t.externalId)
      .where(sql`${t.evolutionInstanceId} IS NOT NULL`),
    conversations_tenant_uazapi_external_unique: uniqueIndex(
      "conversations_tenant_uazapi_external_unique"
    )
      .on(t.tenantId, t.uazapiInstanceId, t.externalId)
      .where(sql`${t.uazapiInstanceId} IS NOT NULL`),
    conversations_tenant_chatwoot_external_unique: uniqueIndex(
      "conversations_tenant_chatwoot_external_unique"
    )
      .on(t.tenantId, t.chatwootAccountId, t.externalId)
      .where(sql`${t.chatwootAccountId} IS NOT NULL`),
    conversations_tenant_wc_external_unique: uniqueIndex(
      "conversations_tenant_wc_external_unique"
    )
      .on(t.tenantId, t.whatsappCloudNumberId, t.externalId)
      .where(sql`${t.whatsappCloudNumberId} IS NOT NULL`),
  })
);
