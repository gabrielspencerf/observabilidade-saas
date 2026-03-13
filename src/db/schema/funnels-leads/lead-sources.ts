import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";

export const leadSources = pgTable(
  "lead_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    sourceType: varchar("source_type", { length: 64 }),
    externalId: varchar("external_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    lead_sources_tenant_idx: index("lead_sources_tenant_idx").on(t.tenantId),
  })
);
