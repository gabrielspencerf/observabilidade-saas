/**
 * Slugs de permissões (espelho do seed e do banco).
 * Usado para checagem e documentação; não substitui o banco como fonte de verdade.
 */
export const PERMISSION_SLUGS = {
  ADMIN_ACCESS: "admin:access",
  DASHBOARD_READ: "dashboard:read",
  TENANT_SWITCH: "tenant:switch",
  LEADS_READ: "leads:read",
  LEADS_WRITE: "leads:write",
  FUNNELS_READ: "funnels:read",
  FUNNELS_WRITE: "funnels:write",
} as const;

export type PermissionSlug = (typeof PERMISSION_SLUGS)[keyof typeof PERMISSION_SLUGS];

/** Permissão global: não depende de tenant (super_admin). */
export const GLOBAL_PERMISSION = PERMISSION_SLUGS.ADMIN_ACCESS;

export const ROLE_SLUGS = {
  SUPER_ADMIN: "super_admin",
  ADMIN_TENANT: "admin_tenant",
  OPERATOR: "operator",
  VIEWER: "viewer",
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];
