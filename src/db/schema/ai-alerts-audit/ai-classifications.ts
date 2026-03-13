import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "../auth/tenants";
import { conversations } from "../conversations/conversations";
import { leads } from "../funnels-leads/leads";
import { classificationTypeEnum } from "../../enums";

/**
 * Classificação IA por conversa; versionamento com is_current e superseded_at.
 * Apenas uma linha por conversation_id com is_current = true (unique partial).
 */
export const aiClassifications = pgTable(
  "ai_classifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    classificationType: classificationTypeEnum("classification_type").notNull(),
    confidenceScore: numeric("confidence_score", { precision: 3, scale: 2 }), // 0.00 - 1.00
    summary: text("summary"),
    evidences: jsonb("evidences").$type<Record<string, unknown>>(),
    modelVersion: varchar("model_version", { length: 64 }),
    version: integer("version").notNull(),
    isCurrent: boolean("is_current").notNull().default(true),
    supersededAt: timestamp("superseded_at", { withTimezone: true, precision: 6 }),
    processedAt: timestamp("processed_at", { withTimezone: true, precision: 6 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    ai_classifications_conversation_version_unique: uniqueIndex(
      "ai_classifications_conversation_version_unique"
    ).on(t.conversationId, t.version),
    ai_classifications_conversation_current_unique: uniqueIndex(
      "ai_classifications_conversation_current_unique"
    )
      .on(t.conversationId)
      .where(sql`${t.isCurrent} = true`),
    ai_classifications_tenant_type_idx: index(
      "ai_classifications_tenant_type_idx"
    ).on(t.tenantId, t.classificationType),
    ai_classifications_tenant_processed_idx: index(
      "ai_classifications_tenant_processed_idx"
    ).on(t.tenantId, t.processedAt),
  })
);
