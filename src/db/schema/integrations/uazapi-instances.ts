import {
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";

/**
 * Instâncias UAZAPI por tenant.
 */
export const uazapiInstances = pgTable(
  "uazapi_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    externalId: varchar("external_id", { length: 64 }).notNull(),
    baseUrl: varchar("base_url", { length: 512 }).notNull(),
    apiKeyEncrypted: text("api_key_encrypted"),
    tokenEncrypted: text("token_encrypted"),
    adminTokenEncrypted: text("admin_token_encrypted"),
    instanceName: varchar("instance_name", { length: 255 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, precision: 6 }),
    lastStatus: varchar("last_status", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    uazapi_instances_tenant_external_unique: unique(
      "uazapi_instances_tenant_external_unique"
    ).on(t.tenantId, t.externalId),
    uazapi_instances_tenant_external_idx: index(
      "uazapi_instances_tenant_external_idx"
    ).on(t.tenantId, t.externalId),
  })
);
