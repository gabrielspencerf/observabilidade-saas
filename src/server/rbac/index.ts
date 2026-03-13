export {
  PERMISSION_SLUGS,
  ROLE_SLUGS,
  GLOBAL_PERMISSION,
} from "./permissions";
export type { PermissionSlug, RoleSlug } from "./permissions";
export {
  roleHasPermission,
  hasPermission,
  hasRole,
  requirePermission,
  requireRole,
} from "./check";
