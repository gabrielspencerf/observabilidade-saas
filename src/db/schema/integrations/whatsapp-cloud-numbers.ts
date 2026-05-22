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

export const whatsappCloudNumbers = pgTable(
  "whatsapp_cloud_numbers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phoneNumberId: varchar("phone_number_id", { length: 64 }).notNull(),
    wabaId: varchar("waba_id", { length: 64 }).notNull(),
    displayPhone: varchar("display_phone", { length: 32 }),
    accessTokenEncrypted: text("access_token_encrypted"),
    webhookVerifyToken: varchar("webhook_verify_token", { length: 255 }),
    label: varchar("label", { length: 255 }),
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
    wc_numbers_tenant_phone_unique: unique(
      "wc_numbers_tenant_phone_unique"
    ).on(t.tenantId, t.phoneNumberId),
    wc_numbers_tenant_phone_idx: index(
      "wc_numbers_tenant_phone_idx"
    ).on(t.tenantId, t.phoneNumberId),
  })
);
