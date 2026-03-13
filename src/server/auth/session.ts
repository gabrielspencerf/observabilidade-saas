/**
 * Criação, leitura e invalidação de sessão (tabela sessions).
 * Token opaco no cookie; apenas token_hash no banco.
 */
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/server/db";
import { sessions, users, tenants } from "@/db/schema";
import { authConfig } from "./config";
import { hashToken, generateOpaqueToken } from "./token";

const SESSION_COOKIE_NAME = authConfig.cookieName;

function getCookieFromRequest(request: Request | null, name: string): string | null {
  if (!request) return null;
  const header = request.headers.get("cookie");
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export interface SessionWithUserAndTenant {
  session: {
    id: string;
    userId: string;
    currentTenantId: string | null;
    expiresAt: Date;
  };
  user: {
    id: string;
    email: string;
    name: string | null;
    isActive: boolean;
  };
  tenant: { id: string; name: string; slug: string } | null;
}

export interface CreateSessionParams {
  userId: string;
  currentTenantId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Cria sessão no banco e retorna o token opaco (para o caller setar o cookie).
 */
export async function createSession(params: CreateSessionParams): Promise<string> {
  const db = getDb();
  const token = generateOpaqueToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + authConfig.sessionTtlSeconds * 1000);

  await db.insert(sessions).values({
    userId: params.userId,
    currentTenantId: params.currentTenantId,
    tokenHash,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    expiresAt,
    lastActivityAt: now,
  });

  return token;
}

/**
 * Busca sessão a partir do cookie da request; verifica expires_at; opcionalmente atualiza last_activity_at.
 * Retorna null se cookie ausente, token inválido ou sessão expirada.
 */
export async function getSessionFromCookie(
  request: Request | null,
  options?: { updateActivity?: boolean }
): Promise<SessionWithUserAndTenant | null> {
  if (!request) return null;
  const token = getCookieFromRequest(request, SESSION_COOKIE_NAME);
  if (!token) return null;

  const db = getDb();
  const tokenHash = hashToken(token);
  const now = new Date();

  const [row] = await db
    .select({
      sessionId: sessions.id,
      userId: sessions.userId,
      currentTenantId: sessions.currentTenantId,
      expiresAt: sessions.expiresAt,
      lastActivityAt: sessions.lastActivityAt,
    })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);

  if (!row) return null;

  if (options?.updateActivity) {
    await db
      .update(sessions)
      .set({ lastActivityAt: now })
      .where(eq(sessions.id, row.sessionId));
  }

  const [userRow] = await db
    .select({ id: users.id, email: users.email, name: users.name, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  if (!userRow || !userRow.isActive) return null;

  let tenant: SessionWithUserAndTenant["tenant"] = null;
  if (row.currentTenantId) {
    const [tenantRow] = await db
      .select({ id: tenants.id, name: tenants.name, slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, row.currentTenantId))
      .limit(1);
    if (tenantRow) tenant = tenantRow;
  }

  return {
    session: {
      id: row.sessionId,
      userId: row.userId,
      currentTenantId: row.currentTenantId,
      expiresAt: row.expiresAt,
    },
    user: {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      isActive: userRow.isActive,
    },
    tenant,
  };
}

/**
 * Atualiza o current_tenant_id da sessão (troca de tenant). Não cria nova sessão.
 */
export async function updateSessionTenant(
  sessionId: string,
  tenantId: string | null
): Promise<void> {
  const db = getDb();
  await db
    .update(sessions)
    .set({ currentTenantId: tenantId, lastActivityAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

/**
 * Invalida a sessão atual (remove do banco). Usar antes de limpar o cookie no logout.
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Invalida a sessão associada ao cookie da request (se existir).
 */
export async function invalidateCurrent(request: Request | null): Promise<boolean> {
  const data = await getSessionFromCookie(request, { updateActivity: false });
  if (!data) return false;
  await invalidateSession(data.session.id);
  return true;
}

/**
 * Invalida todas as sessões do usuário (para uso futuro: "sair de todos os dispositivos").
 */
export async function invalidateAllSessionsForUser(userId: string): Promise<void> {
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * Monta o header Set-Cookie para a sessão (login).
 */
export function buildSetCookieHeader(token: string): string {
  const opts = authConfig.cookieOptions;
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    opts.secure ? "Secure" : "",
    `SameSite=${opts.sameSite}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
  ].filter(Boolean);
  return parts.join("; ");
}

/**
 * Monta o header Set-Cookie para limpar o cookie (logout).
 */
export function buildClearCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`;
}
