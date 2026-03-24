import { index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { leads } from "./leads";
import { funnels } from "./funnels";

export const followupTasks = pgTable(
  "followup_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    funnelId: uuid("funnel_id").references(() => funnels.id, { onDelete: "set null" }),
    profileId: varchar("profile_id", { length: 80 }).notNull().default("default"),
    status: varchar("status", { length: 24 }).notNull().default("pending"), // pending|completed|skipped
    attemptCount: integer("attempt_count").notNull().default(0),
    maxFollowups: integer("max_followups").notNull().default(3),
    intervalHours: integer("interval_hours").notNull().default(24),
    dueAt: timestamp("due_at", { withTimezone: true, precision: 6 }).notNull(),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true, precision: 6 }),
    consultingAgendaRaisedAt: timestamp("consulting_agenda_raised_at", {
      withTimezone: true,
      precision: 6,
    }),
    completedAt: timestamp("completed_at", { withTimezone: true, precision: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    followup_tasks_tenant_status_due_idx: index("followup_tasks_tenant_status_due_idx").on(
      t.tenantId,
      t.status,
      t.dueAt
    ),
    followup_tasks_lead_status_idx: index("followup_tasks_lead_status_idx").on(
      t.leadId,
      t.status
    ),
  })
);
