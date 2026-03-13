import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { funnels } from "./funnels";

export const funnelSteps = pgTable(
  "funnel_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    funnelId: uuid("funnel_id")
      .notNull()
      .references(() => funnels.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    sortOrder: integer("sort_order").notNull(),
    criteria: jsonb("criteria").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    funnel_steps_funnel_sort_unique: unique(
      "funnel_steps_funnel_sort_unique"
    ).on(t.funnelId, t.sortOrder),
    funnel_steps_funnel_idx: index("funnel_steps_funnel_idx").on(t.funnelId),
    funnel_steps_tenant_idx: index("funnel_steps_tenant_idx").on(t.tenantId),
  })
);
