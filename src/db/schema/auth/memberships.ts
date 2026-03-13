import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";
import { roles } from "./roles";

/**
 * Vínculo user ↔ tenant com um papel.
 * Um usuário pode ter várias memberships (uma por tenant).
 */
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    invitedAt: timestamp("invited_at", { withTimezone: true, precision: 6 }).notNull(),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 6 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => ({
    memberships_user_tenant_unique: unique(
      "memberships_user_tenant_unique"
    ).on(t.userId, t.tenantId),
  })
);
