/**
 * Helpers de auth para uso em API routes e server components.
 * getCurrentSession, getCurrentUser, requireAuth.
 */
import { getSessionFromCookie } from "./session";
import type { SessionWithUserAndTenant } from "./session";
import { shouldRequireCsrf, validateCsrfRequest } from "@/server/security/csrf";
import {
  runWithRlsContext,
  applyRlsToCurrentTransaction,
} from "@/server/db/access-context";

/**
 * Retorna a sessão atual (user + tenant) a partir do cookie da request.
 * Atualiza last_activity_at. Retorna null se não autenticado ou sessão expirada.
 */
export async function getCurrentSession(
  request: Request | null
): Promise<SessionWithUserAndTenant | null> {
  return runWithRlsContext({ tenantId: null, bypassRls: false }, async () => {
    const session = await getSessionFromCookie(request, { updateActivity: true });
    if (!session) return null;
    await applyRlsToCurrentTransaction({
      tenantId: session.session.currentTenantId,
      bypassRls: false,
    });
    return session;
  });
}

/**
 * Retorna o usuário atual ou null.
 */
export async function getCurrentUser(request: Request | null) {
  const session = await getCurrentSession(request);
  return session?.user ?? null;
}

/**
 * Exige autenticação: retorna a sessão ou lança erro com status 401 (para uso em route handlers).
 * Uso: const session = await requireAuth(request); ... session.user, session.tenant
 */
export async function requireAuth(
  request: Request | null
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

    await applyRlsToCurrentTransaction({
      tenantId: session.session.currentTenantId,
      bypassRls: false,
    });

    return session;
  });
}
