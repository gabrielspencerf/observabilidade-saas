/**
 * Readiness/heartbeat do worker: verifica se a chave de heartbeat no Redis existe e é recente.
 * Uso: script ou healthcheck externo; não é endpoint HTTP (worker não serve HTTP).
 */

const HEARTBEAT_KEY = "worker:heartbeat";
const MAX_AGE_MS = 30_000; // 30s sem heartbeat = não pronto

export interface ReadinessResult {
  ready: boolean;
  reason?: string;
}

/**
 * Verifica readiness: Redis acessível e heartbeat com menos de MAX_AGE_MS.
 * Deve ser chamado por um script que recebe REDIS_URL (ex.: tsx scripts/worker-readiness.ts).
 */
export async function checkReadiness(redisUrl: string): Promise<ReadinessResult> {
  const Redis = (await import("ioredis")).default;
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
  try {
    const val = await redis.get(HEARTBEAT_KEY);
    await redis.quit();
    if (val === null) {
      return { ready: false, reason: "heartbeat key missing" };
    }
    const ts = parseInt(val, 10);
    if (Number.isNaN(ts)) {
      return { ready: false, reason: "invalid heartbeat value" };
    }
    const age = Date.now() - ts;
    if (age > MAX_AGE_MS) {
      return { ready: false, reason: `heartbeat too old: ${age}ms` };
    }
    return { ready: true };
  } catch (err) {
    try {
      await redis.quit();
    } catch {
      /* ignore */
    }
    return {
      ready: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export { HEARTBEAT_KEY, MAX_AGE_MS };
