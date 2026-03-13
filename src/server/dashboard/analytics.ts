/**
 * Resumo analítico por tenant: totais operacionais + métricas Ads no período + top campanhas.
 * Usa apenas dados já persistidos; sem chamadas a APIs externas.
 */

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  leads,
  conversations,
  googleAdsAccounts,
  campaignSnapshots,
} from "@/db/schema";
import { listLeadsForTenant } from "./leads";
import { listConversationsForTenant } from "./conversations";
import type { LeadRow } from "./leads";
import type { ConversationRow } from "./conversations";

const RECENT_LEADS_LIMIT = 10;
const RECENT_CONVERSATIONS_LIMIT = 10;
const TOP_CAMPAIGNS_LIMIT = 15;
const DEFAULT_PERIOD_DAYS = 30;
const MIN_PERIOD_DAYS = 1;
const MAX_PERIOD_DAYS = 365;

export interface AnalyticsAdsPeriodTotals {
  spend: number;
  clicks: number;
  impressions: number;
}

export interface AnalyticsTopCampaignRow {
  accountExternalId: string;
  campaignName: string;
  externalCampaignId: string;
  spend: number;
  clicks: number;
  impressions: number;
}

export interface AnalyticsSummaryOptions {
  periodDays?: number;
}

export interface AnalyticsSummary {
  totalLeads: number;
  totalConversations: number;
  totalGoogleAdsAccounts: number;
  periodDays: number;
  adsPeriodTotals: AnalyticsAdsPeriodTotals;
  topCampaignsBySpend: AnalyticsTopCampaignRow[];
  recentLeads: LeadRow[];
  recentConversations: ConversationRow[];
}

function clampPeriodDays(days: number): number {
  return Math.min(MAX_PERIOD_DAYS, Math.max(MIN_PERIOD_DAYS, Math.floor(days)));
}

/**
 * Totais de gasto, cliques e impressões nos campaign_snapshots do tenant no período (period_start >= today - periodDays).
 */
async function getAdsPeriodTotals(
  tenantId: string,
  periodDays: number
): Promise<AnalyticsAdsPeriodTotals> {
  const db = getDb();
  const days = clampPeriodDays(periodDays);
  const result = await db.execute<{
    spend: string;
    clicks: string;
    impressions: string;
  }>(sql`
    SELECT
      coalesce(sum(
        coalesce((metrics->>'cost')::numeric, (metrics->>'costMicros')::numeric / 1000000, 0)
      ), 0)::text AS spend,
      coalesce(sum(coalesce((metrics->>'clicks')::bigint, 0)), 0)::text AS clicks,
      coalesce(sum(coalesce((metrics->>'impressions')::bigint, 0)), 0)::text AS impressions
    FROM campaign_snapshots
    WHERE tenant_id = ${tenantId}
      AND period_start >= current_date - (${days} * interval '1 day')
  `);

  const rows = Array.isArray(result) ? result : (result as { rows?: typeof result }).rows ?? [];
  const row = rows[0];
  if (!row) {
    return { spend: 0, clicks: 0, impressions: 0 };
  }
  return {
    spend: Number(row.spend),
    clicks: Number(row.clicks),
    impressions: Number(row.impressions),
  };
}

/**
 * Campanhas com maior gasto no período (agregado por conta + campanha).
 */
async function getTopCampaignsBySpend(
  tenantId: string,
  periodDays: number
): Promise<AnalyticsTopCampaignRow[]> {
  const db = getDb();
  const days = clampPeriodDays(periodDays);
  const result = await db.execute<{
    account_external_id: string;
    campaign_name: string;
    external_campaign_id: string;
    spend: string;
    clicks: string;
    impressions: string;
  }>(sql`
    SELECT
      ga.external_id AS account_external_id,
      cs.campaign_name,
      cs.external_campaign_id,
      sum(coalesce((cs.metrics->>'cost')::numeric, (cs.metrics->>'costMicros')::numeric / 1000000, 0))::text AS spend,
      sum(coalesce((cs.metrics->>'clicks')::bigint, 0))::text AS clicks,
      sum(coalesce((cs.metrics->>'impressions')::bigint, 0))::text AS impressions
    FROM campaign_snapshots cs
    INNER JOIN google_ads_accounts ga ON cs.google_ads_account_id = ga.id
    WHERE cs.tenant_id = ${tenantId}
      AND cs.period_start >= current_date - (${days} * interval '1 day')
    GROUP BY ga.external_id, cs.campaign_name, cs.external_campaign_id, cs.google_ads_account_id
    ORDER BY sum(coalesce((cs.metrics->>'cost')::numeric, (cs.metrics->>'costMicros')::numeric / 1000000, 0)) DESC
    LIMIT ${TOP_CAMPAIGNS_LIMIT}
  `);

  const rows = Array.isArray(result) ? result : (result as { rows?: typeof result }).rows ?? [];
  return rows.map((r) => ({
    accountExternalId: r.account_external_id,
    campaignName: r.campaign_name,
    externalCampaignId: r.external_campaign_id,
    spend: Number(r.spend),
    clicks: Number(r.clicks),
    impressions: Number(r.impressions),
  }));
}

/**
 * Resumo analítico completo: totais gerais, métricas Ads no período, top campanhas e listas recentes.
 * Tudo tenant-scoped; período aplicado apenas aos dados de Ads.
 */
export async function getAnalyticsSummaryForTenant(
  tenantId: string,
  options: AnalyticsSummaryOptions = {}
): Promise<AnalyticsSummary> {
  const periodDays = clampPeriodDays(options.periodDays ?? DEFAULT_PERIOD_DAYS);
  const db = getDb();

  const [
    totalLeadsResult,
    totalConvsResult,
    totalAccountsResult,
    adsTotals,
    topCampaigns,
    recentLeads,
    recentConversations,
  ] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.tenantId, tenantId)),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(conversations)
      .where(eq(conversations.tenantId, tenantId)),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(googleAdsAccounts)
      .where(eq(googleAdsAccounts.tenantId, tenantId)),
    getAdsPeriodTotals(tenantId, periodDays),
    getTopCampaignsBySpend(tenantId, periodDays),
    listLeadsForTenant(tenantId, { limit: RECENT_LEADS_LIMIT }),
    listConversationsForTenant(tenantId, { limit: RECENT_CONVERSATIONS_LIMIT }),
  ]);

  const totalLeads = totalLeadsResult[0]?.value ?? 0;
  const totalConversations = totalConvsResult[0]?.value ?? 0;
  const totalGoogleAdsAccounts = totalAccountsResult[0]?.value ?? 0;

  return {
    totalLeads,
    totalConversations,
    totalGoogleAdsAccounts,
    periodDays,
    adsPeriodTotals: adsTotals,
    topCampaignsBySpend: topCampaigns,
    recentLeads,
    recentConversations,
  };
}
