import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { clarityConnections } from "../integrations/clarity-connections";

export const clarityInsightSnapshots = pgTable(
  "clarity_insight_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clarityConnectionId: uuid("clarity_connection_id")
      .notNull()
      .references(() => clarityConnections.id, { onDelete: "cascade" }),
    numOfDays: integer("num_of_days").notNull(),
    dimension1: varchar("dimension1", { length: 64 }),
    payload: jsonb("payload").$type<unknown>().notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true, precision: 6 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    clarity_insight_snapshots_tenant_synced_idx: index(
      "clarity_insight_snapshots_tenant_synced_idx"
    ).on(t.tenantId, t.syncedAt),
    clarity_insight_snapshots_connection_synced_idx: index(
      "clarity_insight_snapshots_connection_synced_idx"
    ).on(t.clarityConnectionId, t.syncedAt),
  })
);
