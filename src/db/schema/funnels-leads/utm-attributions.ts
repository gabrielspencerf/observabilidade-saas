import {
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { leads } from "./leads";

/**
 * Atribuições UTM; append-only. First-touch = linha com touch_sequence 1, last-touch = MAX(touch_sequence) por lead.
 */
export const utmAttributions = pgTable(
  "utm_attributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    touchType: varchar("touch_type", { length: 32 }).notNull(), // first_touch | last_touch | linear
    touchSequence: integer("touch_sequence").notNull(),
    touchedAt: timestamp("touched_at", { withTimezone: true, precision: 6 }).notNull(),
    utmSource: varchar("utm_source", { length: 255 }),
    utmMedium: varchar("utm_medium", { length: 255 }),
    utmCampaign: varchar("utm_campaign", { length: 255 }),
    utmTerm: varchar("utm_term", { length: 255 }),
    utmContent: varchar("utm_content", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    utm_attributions_lead_sequence_unique: unique(
      "utm_attributions_lead_sequence_unique"
    ).on(t.leadId, t.touchSequence),
    utm_attributions_lead_touched_idx: index(
      "utm_attributions_lead_touched_idx"
    ).on(t.leadId, t.touchedAt),
    utm_attributions_tenant_touched_idx: index(
      "utm_attributions_tenant_touched_idx"
    ).on(t.tenantId, t.touchedAt),
  })
);
