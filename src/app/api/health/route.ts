/**
 * Healthcheck: verifica se a aplicação e o banco respondem.
 * Uso: GET /api/health — 200 = ok; 503 = banco inacessível.
 */
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { createRedisClient } from "@/server/redis";
import { HEARTBEAT_KEY, MAX_AGE_MS } from "@/workers/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbOk = false;
  let redisOk = false;
  let workerStatus: "ok" | "stale" | "missing" | "error" = "missing";

  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch (err) {
    console.error("Health check failed (db):", err);
  }

  try {
    const redis = createRedisClient();
    try {
      const heartbeatRaw = await redis.get(HEARTBEAT_KEY);
      redisOk = true;
      if (!heartbeatRaw) {
        workerStatus = "missing";
      } else {
        const ts = Number(heartbeatRaw);
        workerStatus =
          Number.isFinite(ts) && Date.now() - ts <= MAX_AGE_MS ? "ok" : "stale";
      }
    } finally {
      redis.quit();
    }
  } catch (err) {
    console.error("Health check failed (redis):", err);
    workerStatus = "error";
  }

  const ok = dbOk && redisOk && workerStatus === "ok";
  return NextResponse.json(
    {
      ok,
      db: dbOk ? "ok" : "error",
      redis: redisOk ? "ok" : "error",
      worker: workerStatus,
    },
    { status: ok ? 200 : 503 }
  );
}
