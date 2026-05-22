/**
 * Auth + RBAC para rotas /api/dashboard/* (escopo tenant da sessão).
 */
import { getSessionFromCookie } from "@/server/auth/session";
import type { SessionWithUserAndTenant } from "@/server/auth/session";
import { shouldRequireCsrf, validateCsrfRequest } from "@/server/security/csrf";
import { requirePermission } from "@/server/rbac";
import { PERMISSION_SLUGS, type PermissionSlug } from "@/server/rbac/permissions";
import {
  runWithRlsContext,
  applyRlsToCurrentTransaction,
} from "@/server/db/access-context";

export async function requireDashboardApiAuth(
  request: Request,
  permission: PermissionSlug = PERMISSION_SLUGS.DASHBOARD_READ
): Promise<SessionWithUserAndTenant> {
  return runWithRlsContext({ tenantId: null, bypassRls: false }, async () => {
    const session = await getSessionFromCookie(request, { updateActivity: true });
    if (!session) {
      const err = new Error("Não autenticado") as Error & { status?: number };
      err.status = 401;
      throw err;
    }

    if (shouldRequireCsrf(request)) {
      const csrf = await validateCsrfRequest(request);
      if (!csrf.ok) {
        const err = new Error("CSRF inválido") as Error & { status?: number };
        err.status = 403;
        throw err;
      }
    }

    const tenantId = session.session.currentTenantId;
    if (!tenantId) {
      const err = new Error("Selecione um tenant") as Error & { status?: number };
      err.status = 400;
      throw err;
    }

    await applyRlsToCurrentTransaction({
      tenantId,
      bypassRls: false,
    });

    await requirePermission(session.user.id, tenantId, permission);
    return session;
  });
}
