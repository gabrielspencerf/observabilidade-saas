import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "../auth/tenants";

/**
 * Falhas de processamento (jobs/workers); append-only.
 * payload_summary sem segredos; apenas ids e metadados.
 */
export const processingFailures = pgTable(
  "processing_failures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    jobType: varchar("job_type", { length: 64 }).notNull(),
    jobId: varchar("job_id", { length: 255 }),
    resourceType: varchar("resource_type", { length: 64 }),
    resourceId: varchar("resource_id", { length: 255 }),
    payloadSummary: jsonb("payload_summary").$type<Record<string, unknown>>(),
    errorMessage: text("error_message"),
    errorCode: varchar("error_code", { length: 64 }),
    failedAt: timestamp("failed_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    retryCount: integer("retry_count").notNull().default(0),
    resolvedAt: timestamp("resolved_at", { withTimezone: true, precision: 6 }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    processing_failures_tenant_failed_idx: index(
      "processing_failures_tenant_failed_idx"
    ).on(t.tenantId, t.failedAt),
    processing_failures_job_type_failed_idx: index(
      "processing_failures_job_type_failed_idx"
    ).on(t.jobType, t.failedAt),
    processing_failures_unresolved_idx: index(
      "processing_failures_unresolved_idx"
    )
      .on(t.resolvedAt)
      .where(sql`${t.resolvedAt} IS NULL`),
  })
);
