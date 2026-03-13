import { primaryKey, pgTable, uuid } from "drizzle-orm/pg-core";
import { roles } from "./roles";
import { permissions } from "./permissions";

/**
 * N:N entre roles e permissions.
 * Sem tenant_id; tabela global.
 */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => ({
    role_permissions_pkey: primaryKey({
      columns: [t.roleId, t.permissionId],
    }),
  })
);
