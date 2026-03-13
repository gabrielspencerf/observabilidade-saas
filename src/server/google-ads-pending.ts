/**
 * Estado "pending" da conexão OAuth Google Ads: armazenado no Redis entre callback e escolha de conta.
 * Usado para permitir que o tenant escolha qual conta conectar (em vez do primeiro customer_id).
 */

import { createRedisClient } from "@/server/redis";

export const PENDING_KEY_PREFIX = "google_ads_pending:";
export const PENDING_TTL_SEC = 600;

export interface PendingConnectionPayload {
  tenantId: string;
  refreshTokenEncrypted: string;
  accessTokenEncrypted: string;
  tokenExpiresAt: string;
  customerIds: string[];
}

/**
 * Carrega o pending pelo token e valida o tenant. Não remove do Redis.
 * Retorna apenas customerIds para exibição na página de escolha.
 */
export async function loadPendingConnection(
  pendingToken: string,
  tenantId: string
): Promise<{ customerIds: string[] } | null> {
  if (!pendingToken || !tenantId) return null;
  const redis = createRedisClient();
  try {
    const raw = await redis.get(PENDING_KEY_PREFIX + pendingToken);
    if (!raw) return null;
    const payload = JSON.parse(raw) as PendingConnectionPayload;
    if (payload.tenantId !== tenantId) return null;
    return { customerIds: payload.customerIds };
  } catch {
    return null;
  } finally {
    redis.quit();
  }
}

/**
 * Consome o pending: valida tenant, retorna payload e remove a chave do Redis.
 * Usado na API complete para salvar a conta e invalidar o token.
 */
export async function consumePendingConnection(
  pendingToken: string,
  tenantId: string
): Promise<PendingConnectionPayload | null> {
  if (!pendingToken || !tenantId) return null;
  const redis = createRedisClient();
  try {
    const key = PENDING_KEY_PREFIX + pendingToken;
    const raw = await redis.get(key);
    if (!raw) return null;
    const payload = JSON.parse(raw) as PendingConnectionPayload;
    if (payload.tenantId !== tenantId) return null;
    await redis.del(key);
    return payload;
  } catch {
    return null;
  } finally {
    redis.quit();
  }
}
