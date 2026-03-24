/**
 * Pending OAuth Meta: entre callback e escolha do ad account.
 */

import { createRedisClient } from "@/server/redis";

export const META_PENDING_KEY_PREFIX = "meta_ads_pending:";
export const META_PENDING_TTL_SEC = 600;

export interface MetaPendingAdAccount {
  id: string;
  accountId: string;
  name: string;
  currency?: string;
}

export interface MetaPendingConnectionPayload {
  tenantId: string;
  longLivedTokenEncrypted: string;
  tokenExpiresAt: string | null;
  adAccounts: MetaPendingAdAccount[];
}

export async function loadPendingMetaConnection(
  pendingToken: string,
  tenantId: string
): Promise<{ adAccounts: MetaPendingAdAccount[] } | null> {
  if (!pendingToken || !tenantId) return null;
  const redis = createRedisClient();
  try {
    const raw = await redis.get(META_PENDING_KEY_PREFIX + pendingToken);
    if (!raw) return null;
    const payload = JSON.parse(raw) as MetaPendingConnectionPayload;
    if (payload.tenantId !== tenantId) return null;
    return { adAccounts: payload.adAccounts };
  } catch {
    return null;
  } finally {
    redis.quit();
  }
}

export async function consumePendingMetaConnection(
  pendingToken: string,
  tenantId: string
): Promise<MetaPendingConnectionPayload | null> {
  if (!pendingToken || !tenantId) return null;
  const redis = createRedisClient();
  try {
    const key = META_PENDING_KEY_PREFIX + pendingToken;
    const raw = await redis.get(key);
    if (!raw) return null;
    const payload = JSON.parse(raw) as MetaPendingConnectionPayload;
    if (payload.tenantId !== tenantId) return null;
    await redis.del(key);
    return payload;
  } catch {
    return null;
  } finally {
    redis.quit();
  }
}
