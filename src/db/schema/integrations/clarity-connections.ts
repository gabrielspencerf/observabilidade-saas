import { index, pgTable, timestamp, uuid, varchar, text } from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";

/**
 * Token JWT do Clarity Data Export (por projeto); um tenant pode ter várias conexões.
 */
export const clarityConnections = pgTable(
  "clarity_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 255 }),
    apiTokenEncrypted: text("api_token_encrypted").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, precision: 6 }),
    lastSyncError: varchar("last_sync_error", { length: 1024 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    clarity_connections_tenant_idx: index("clarity_connections_tenant_idx").on(t.tenantId),
  })
);
