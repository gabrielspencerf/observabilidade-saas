import {
  boolean,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { providerEnum } from "../../enums";

/**
 * Camada comum de integrações: um registro por conexão tenant ↔ provedor.
 * provider_resource_id aponta para o id na tabela específica (google_ads_accounts, typebot_bots ou evolution_instances);
 * integridade garantida na aplicação (sem FK polimórfica no banco).
 */
export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: providerEnum("provider").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    /** UUID do registro na tabela específica do provedor (google_ads_accounts.id, typebot_bots.id ou evolution_instances.id) */
    providerResourceId: uuid("provider_resource_id").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, precision: 6 }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true, precision: 6 }),
    lastErrorMessage: varchar("last_error_message", { length: 1024 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    integrations_tenant_provider_resource_unique: unique(
      "integrations_tenant_provider_resource_unique"
    ).on(t.tenantId, t.provider, t.providerResourceId),
    integrations_tenant_provider_idx: index(
      "integrations_tenant_provider_idx"
    ).on(t.tenantId, t.provider),
    integrations_tenant_active_idx: index(
      "integrations_tenant_active_idx"
    ).on(t.tenantId, t.isActive),
  })
);
