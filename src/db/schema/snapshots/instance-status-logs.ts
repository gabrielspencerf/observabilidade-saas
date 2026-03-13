import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "../auth/tenants";
import { evolutionInstances } from "../integrations/evolution-instances";

/**
 * Histórico de status da instância Evolution; append-only (uma linha por mudança).
 */
export const instanceStatusLogs = pgTable(
  "instance_status_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    evolutionInstanceId: uuid("evolution_instance_id")
      .notNull()
      .references(() => evolutionInstances.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 64 }).notNull(),
    details: jsonb("details").$type<Record<string, unknown>>(),
    recordedAt: timestamp("recorded_at", { withTimezone: true, precision: 6 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    instance_status_logs_instance_recorded_idx: index(
      "instance_status_logs_instance_recorded_idx"
    ).on(t.evolutionInstanceId, t.recordedAt),
    instance_status_logs_tenant_recorded_idx: index(
      "instance_status_logs_tenant_recorded_idx"
    ).on(t.tenantId, t.recordedAt),
  })
);
