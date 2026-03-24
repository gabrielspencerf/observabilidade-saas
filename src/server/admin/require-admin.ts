/**
 * Exige sessão e permissão admin:access (super_admin) para operações do admin global.
 * Uso em API routes e em código que precisa garantir que o caller é super_admin.
 */
import { requireAuth } from "@/server/auth";
import { requirePermission } from "@/server/rbac/check";
import { PERMISSION_SLUGS } from "@/server/rbac/permissions";
import type { SessionWithUserAndTenant } from "@/server/auth/session";
import { setDbAccessContext } from "@/server/db/access-context";

export async function requireAdmin(
  request: Request | null
): Promise<SessionWithUserAndTenant> {
  const session = await requireAuth(request);
  await requirePermission(
    session.user.id,
    null,
    PERMISSION_SLUGS.ADMIN_ACCESS
  );
  await setDbAccessContext({
    tenantId: null,
    bypassRls: true,
  });
  return session;
}
