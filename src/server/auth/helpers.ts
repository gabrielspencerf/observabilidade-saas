/**
 * Helpers de auth para uso em API routes e server components.
 * getCurrentSession, getCurrentUser, requireAuth.
 */
import { getSessionFromCookie } from "./session";
import type { SessionWithUserAndTenant } from "./session";

/**
 * Retorna a sessão atual (user + tenant) a partir do cookie da request.
 * Atualiza last_activity_at. Retorna null se não autenticado ou sessão expirada.
 */
export async function getCurrentSession(
  request: Request | null
): Promise<SessionWithUserAndTenant | null> {
  return getSessionFromCookie(request, { updateActivity: true });
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
  const session = await getCurrentSession(request);
  if (!session) {
    const err = new Error("Não autenticado") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return session;
}
