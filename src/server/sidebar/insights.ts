import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { createRedisClient } from "@/server/redis";
import { HEARTBEAT_KEY, MAX_AGE_MS } from "@/workers/readiness";
import type { SidebarInsightsPayload } from "@/types/sidebar-insights";

const DEFAULT_PERIOD_DAYS = 30;
const MIN_PERIOD_DAYS = 1;
const MAX_PERIOD_DAYS = 365;

function clampPeriodDays(days?: number): number {
  const base = days ?? DEFAULT_PERIOD_DAYS;
  return Math.min(MAX_PERIOD_DAYS, Math.max(MIN_PERIOD_DAYS, Math.floor(base)));
}

async function getAdsSpend(periodDays: number, tenantId?: string): Promise<number> {
  const db = getDb();
  const tenantFilter = tenantId ? sql`AND tenant_id = ${tenantId}` : sql``;
  const result = await db.execute<{ spend: string }>(sql`
    SELECT
      coalesce(
        sum(
          coalesce((metrics->>'cost')::numeric, (metrics->>'costMicros')::numeric / 1000000, 0)
        ),
        0
      )::text AS spend
    FROM campaign_snapshots
    WHERE period_start >= current_date - (${periodDays} * interval '1 day')
      ${tenantFilter}
  `);
  const rows = Array.isArray(result) ? result : (result as { rows?: typeof result }).rows ?? [];
  return Number(rows[0]?.spend ?? 0);
}

async function getWonRevenue(periodDays: number, tenantId?: string): Promise<number> {
  const db = getDb();
  const tenantFilter = tenantId ? sql`AND tenant_id = ${tenantId}` : sql``;
  const result = await db.execute<{ revenue: string }>(sql`
    SELECT
      coalesce(sum(coalesce(job_value::numeric, 0)), 0)::text AS revenue
    FROM opportunities
    WHERE stage = 'won'
      AND updated_at >= now() - (${periodDays} * interval '1 day')
      ${tenantFilter}
  `);
  const rows = Array.isArray(result) ? result : (result as { rows?: typeof result }).rows ?? [];
  return Number(rows[0]?.revenue ?? 0);
}

async function getContractCost(periodDays: number, tenantId?: string): Promise<number> {
  const db = getDb();
  const tenantFilter = tenantId ? sql`AND tenant_id = ${tenantId}` : sql``;
  const monthsInPeriod = Math.max(1, periodDays / 30);
  const result = await db.execute<{ contract_cost: string }>(sql`
    SELECT
      coalesce(
        sum(
          CASE
            WHEN billing_type = 'recurring' AND billing_interval = 'yearly' THEN coalesce(unit_price::numeric, 0) / 12
            WHEN billing_type = 'recurring' THEN coalesce(unit_price::numeric, 0)
            ELSE 0
          END
        ),
        0
      )::text AS contract_cost
    FROM products
    WHERE is_active = true
      ${tenantFilter}
  `);
  const rows = Array.isArray(result) ? result : (result as { rows?: typeof result }).rows ?? [];
  const monthlyContract = Number(rows[0]?.contract_cost ?? 0);
  return monthlyContract * monthsInPeriod;
}

function buildInsightsPayload(input: {
  periodDays: number;
  adsSpend: number;
  wonRevenue: number;
  contractCost: number;
}): SidebarInsightsPayload {
  const { periodDays, adsSpend, wonRevenue, contractCost } = input;
  const roas = adsSpend > 0 ? wonRevenue / adsSpend : null;
  const totalInvestment = adsSpend + contractCost;
  const roi = totalInvestment > 0 ? (wonRevenue - totalInvestment) / totalInvestment : null;

  return {
    periodDays,
    cards: [
      {
        id: "roas",
        label: "ROAS",
        value: roas,
        valueType: "ratio",
        hint:
          roas === null
            ? "Dados insuficientes para calcular ROAS"
            : `Receita ganha / Ads (${periodDays} dias)`,
      },
      {
        id: "roi",
        label: "ROI",
        value: roi,
        valueType: "percent",
        hint:
          roi === null
            ? "Dados insuficientes para calcular ROI"
            : "Receita vs investimento (ads + contrato)",
      },
      {
        id: "ads-spend",
        label: "Investimento em Ads",
        value: adsSpend,
        valueType: "currency",
        hint: `Período de ${periodDays} dias`,
      },
      {
        id: "contract-cost",
        label: "Custo Contratual",
        value: contractCost,
        valueType: "currency",
        hint: "Baseado em ticket/produtos ativos",
      },
    ],
  };
}

export async function getSidebarInsightsForTenant(
  tenantId: string,
  options?: { periodDays?: number }
): Promise<SidebarInsightsPayload> {
  const periodDays = clampPeriodDays(options?.periodDays);
  const [adsSpend, wonRevenue, contractCost] = await Promise.all([
    getAdsSpend(periodDays, tenantId),
    getWonRevenue(periodDays, tenantId),
    getContractCost(periodDays, tenantId),
  ]);
  return buildInsightsPayload({ periodDays, adsSpend, wonRevenue, contractCost });
}

export async function getSidebarInsightsForAdmin(
  options?: { periodDays?: number }
): Promise<SidebarInsightsPayload> {
  const periodDays = clampPeriodDays(options?.periodDays);
  let dbOk = false;
  let redisOk = false;
  let workerOk = false;

  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }

  try {
    const redis = createRedisClient();
    try {
      const heartbeatRaw = await redis.get(HEARTBEAT_KEY);
      redisOk = true;
      const ts = Number(heartbeatRaw);
      workerOk =
        Boolean(heartbeatRaw) &&
        Number.isFinite(ts) &&
        Date.now() - ts <= MAX_AGE_MS;
    } finally {
      redis.quit();
    }
  } catch {
    redisOk = false;
    workerOk = false;
  }

  return {
    periodDays,
    cards: [
      {
        id: "api-status",
        label: "API",
        value: 1,
        valueType: "status",
        statusLabel: "ok",
        hint: "Aplicação respondendo normalmente",
      },
      {
        id: "db-status",
        label: "Banco",
        value: dbOk ? 1 : 0,
        valueType: "status",
        statusLabel: dbOk ? "ok" : "erro",
        hint: dbOk ? "Conexão com banco saudável" : "Falha ao consultar banco",
      },
      {
        id: "redis-status",
        label: "Redis",
        value: redisOk ? 1 : 0,
        valueType: "status",
        statusLabel: redisOk ? "ok" : "erro",
        hint: redisOk ? "Cache e fila disponíveis" : "Redis indisponível",
      },
      {
        id: "worker-status",
        label: "Worker",
        value: workerOk ? 1 : 0,
        valueType: "status",
        statusLabel: workerOk ? "ok" : "stale",
        hint: workerOk ? "Heartbeat em dia" : "Worker sem heartbeat recente",
      },
    ],
  };
}
