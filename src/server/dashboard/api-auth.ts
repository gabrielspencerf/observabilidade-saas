/**
 * Auth + RBAC para rotas /api/dashboard/* (escopo tenant da sessão).
 */
import { requireAuth } from "@/server/auth";
import type { SessionWithUserAndTenant } from "@/server/auth/session";
import { requirePermission } from "@/server/rbac";
import { PERMISSION_SLUGS, type PermissionSlug } from "@/server/rbac/permissions";

export async function requireDashboardApiAuth(
  request: Request,
  permission: PermissionSlug = PERMISSION_SLUGS.DASHBOARD_READ
): Promise<SessionWithUserAndTenant> {
  const session = await requireAuth(request);
  const tenantId = session.session.currentTenantId;
  if (!tenantId) {
    const err = new Error("Selecione um tenant") as Error & { status?: number };
    err.status = 400;
    throw err;
  }
  await requirePermission(session.user.id, tenantId, permission);
  return session;
}
