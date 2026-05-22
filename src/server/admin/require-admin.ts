/**
 * Admin global (super_admin): autenticação + bypass RLS na mesma transação
 * para que consultas administrativas não dependam de estado global na conexão.
 */
import { getSessionFromCookie } from "@/server/auth/session";
import type { SessionWithUserAndTenant } from "@/server/auth/session";
import { shouldRequireCsrf, validateCsrfRequest } from "@/server/security/csrf";
import { requirePermission } from "@/server/rbac/check";
import { PERMISSION_SLUGS } from "@/server/rbac/permissions";
import { runWithRlsContext } from "@/server/db/access-context";

async function assertSuperAdminSession(
  request: Request | null
): Promise<SessionWithUserAndTenant> {
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

  await requirePermission(session.user.id, null, PERMISSION_SLUGS.ADMIN_ACCESS);
  return session;
}

/**
 * Executa `fn` com sessão de super_admin validada e RLS em modo bypass (transação única).
 */
export async function withAdminApiContext<T>(
  request: Request | null,
  fn: (session: SessionWithUserAndTenant) => Promise<T>
): Promise<T> {
  return runWithRlsContext({ tenantId: null, bypassRls: true }, async () => {
    const session = await assertSuperAdminSession(request);
    return fn(session);
  });
}

/**
 * @deprecated Prefira `withAdminApiContext` para envolver toda a rota admin.
 * Mantido para compatibilidade: apenas valida sessão (transação curta).
 */
export async function requireAdmin(
  request: Request | null
): Promise<SessionWithUserAndTenant> {
  return runWithRlsContext({ tenantId: null, bypassRls: true }, async () =>
    assertSuperAdminSession(request)
  );
}
