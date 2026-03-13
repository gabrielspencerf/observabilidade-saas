/**
 * Atribuição operacional Google Ads → Leads (refinada).
 * Prioridade: 1) match exato por external_campaign_id, 2) match por campaign_name normalizado (fallback).
 * Se mais de um match possível (por ID ou por nome) → ambíguo, não atribuído na visão principal.
 * Um lead conta no máximo uma vez.
 * Regra temporal: apenas leads com first_seen_at na mesma janela usada nas métricas Ads (período selecionado).
 * Cálculo on-the-fly; sem persistência.
 */

import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";

const DEFAULT_PERIOD_DAYS = 30;
const MIN_PERIOD_DAYS = 1;
const MAX_PERIOD_DAYS = 365;

export type AttributionMatchType = "exact_match" | "name_match" | "ambiguous" | "unmatched";

export interface CampaignAttributionRow {
  googleAdsAccountId: string;
  accountExternalId: string;
  externalCampaignId: string;
  campaignName: string;
  /** Leads com match exato por external_campaign_id (utm_campaign = id). */
  exactMatchLeadCount: number;
  /** Leads com match apenas por nome normalizado (fallback; único match por nome). */
  nameMatchLeadCount: number;
  /** exactMatchLeadCount + nameMatchLeadCount (visão principal; cada lead no máximo uma vez). */
  attributedLeadCount: number;
  spend: number;
  clicks: number;
  impressions: number;
}

export interface AttributionSummary {
  totalExactMatch: number;
  totalNameMatch: number;
  totalAmbiguous: number;
  totalUnmatched: number;
}

export interface CampaignAttributionResult {
  campaigns: CampaignAttributionRow[];
  summary: AttributionSummary;
}

export interface CampaignAttributionOptions {
  periodDays?: number;
}

function clampPeriodDays(days: number): number {
  return Math.min(
    MAX_PERIOD_DAYS,
    Math.max(MIN_PERIOD_DAYS, Math.floor(days))
  );
}

function normalize(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function campaignKey(accountId: string, externalCampaignId: string): string {
  return `${accountId}:${externalCampaignId}`;
}

/**
 * Classifica cada lead (last-touch com fonte Google) em exact_match, name_match, ambiguous ou unmatched.
 * Retorna o campaignKey atribuído (quando único) ou null.
 */
function classifyLead(
  utmCampaign: string | null,
  campaigns: { googleAdsAccountId: string; externalCampaignId: string; campaignName: string }[]
): { type: AttributionMatchType; campaignKey: string | null } {
  const campaign = utmCampaign ?? "";

  const matchesById = campaigns.filter((c) => c.externalCampaignId === campaign);
  if (matchesById.length === 1) {
    return {
      type: "exact_match",
      campaignKey: campaignKey(matchesById[0].googleAdsAccountId, matchesById[0].externalCampaignId),
    };
  }
  if (matchesById.length > 1) {
    return { type: "ambiguous", campaignKey: null };
  }

  const norm = normalize(campaign);
  if (!norm) return { type: "unmatched", campaignKey: null };

  const matchesByName = campaigns.filter(
    (c) => normalize(c.campaignName) === norm
  );
  if (matchesByName.length === 1) {
    return {
      type: "name_match",
      campaignKey: campaignKey(matchesByName[0].googleAdsAccountId, matchesByName[0].externalCampaignId),
    };
  }
  if (matchesByName.length > 1) {
    return { type: "ambiguous", campaignKey: null };
  }
  return { type: "unmatched", campaignKey: null };
}

/**
 * Retorna campanhas com contagem por tipo de match e totais (summary).
 * Garante unicidade: cada lead conta no máximo uma vez (exact ou name quando único).
 */
export async function getCampaignAttributionForTenant(
  tenantId: string,
  options: CampaignAttributionOptions = {}
): Promise<CampaignAttributionResult> {
  const periodDays = clampPeriodDays(options.periodDays ?? DEFAULT_PERIOD_DAYS);
  const db = getDb();

  const days = periodDays;
  const [lastTouchResult, campaignsResult, metricsResult] = await Promise.all([
    db.execute<{ lead_id: string; utm_campaign: string | null }>(sql`
      WITH leads_in_period AS (
        SELECT id FROM leads
        WHERE tenant_id = ${tenantId}
          AND first_seen_at >= (current_date - (${days} * interval '1 day'))::timestamp
          AND first_seen_at < (current_date + interval '1 day')::timestamp
      ),
      last_touch_raw AS (
        SELECT u.lead_id, u.utm_campaign,
               row_number() OVER (PARTITION BY u.lead_id ORDER BY u.touch_sequence DESC) AS rn
        FROM utm_attributions u
        WHERE u.tenant_id = ${tenantId}
          AND trim(lower(coalesce(u.utm_source, ''))) LIKE 'google%'
          AND u.lead_id IN (SELECT id FROM leads_in_period)
      )
      SELECT lead_id, utm_campaign
      FROM last_touch_raw
      WHERE rn = 1
    `),
    db.execute<{
      google_ads_account_id: string;
      external_campaign_id: string;
      campaign_name: string;
      account_external_id: string;
    }>(sql`
      SELECT DISTINCT ON (cs.google_ads_account_id, cs.external_campaign_id)
        cs.google_ads_account_id,
        cs.external_campaign_id,
        cs.campaign_name,
        ga.external_id AS account_external_id
      FROM campaign_snapshots cs
      INNER JOIN google_ads_accounts ga ON ga.id = cs.google_ads_account_id
      WHERE cs.tenant_id = ${tenantId}
      ORDER BY cs.google_ads_account_id, cs.external_campaign_id, cs.period_start DESC
    `),
    db.execute<{
      google_ads_account_id: string;
      external_campaign_id: string;
      campaign_name: string;
      account_external_id: string;
      spend: string;
      clicks: string;
      impressions: string;
    }>(sql`
      SELECT
        cs.google_ads_account_id,
        cs.external_campaign_id,
        cs.campaign_name,
        ga.external_id AS account_external_id,
        sum(coalesce((cs.metrics->>'cost')::numeric, (cs.metrics->>'costMicros')::numeric / 1000000, 0))::text AS spend,
        sum(coalesce((cs.metrics->>'clicks')::bigint, 0))::text AS clicks,
        sum(coalesce((cs.metrics->>'impressions')::bigint, 0))::text AS impressions
      FROM campaign_snapshots cs
      INNER JOIN google_ads_accounts ga ON ga.id = cs.google_ads_account_id
      WHERE cs.tenant_id = ${tenantId}
        AND cs.period_start >= current_date - (${periodDays} * interval '1 day')
      GROUP BY cs.google_ads_account_id, cs.external_campaign_id, cs.campaign_name, ga.external_id
    `),
  ]);

  const lastTouchRows =
    Array.isArray(lastTouchResult) ? lastTouchResult : (lastTouchResult as { rows?: typeof lastTouchResult }).rows ?? [];
  const campaignRows =
    Array.isArray(campaignsResult) ? campaignsResult : (campaignsResult as { rows?: typeof campaignsResult }).rows ?? [];
  const metricsRows =
    Array.isArray(metricsResult) ? metricsResult : (metricsResult as { rows?: typeof metricsResult }).rows ?? [];

  const campaigns = campaignRows.map((r) => ({
    googleAdsAccountId: r.google_ads_account_id,
    accountExternalId: r.account_external_id,
    externalCampaignId: r.external_campaign_id,
    campaignName: r.campaign_name,
  }));

  const exactCount = new Map<string, number>();
  const nameCount = new Map<string, number>();
  let totalAmbiguous = 0;
  let totalUnmatched = 0;

  for (const row of lastTouchRows) {
    const { type, campaignKey: key } = classifyLead(row.utm_campaign, campaigns);
    switch (type) {
      case "exact_match":
        if (key) exactCount.set(key, (exactCount.get(key) ?? 0) + 1);
        break;
      case "name_match":
        if (key) nameCount.set(key, (nameCount.get(key) ?? 0) + 1);
        break;
      case "ambiguous":
        totalAmbiguous += 1;
        break;
      case "unmatched":
        totalUnmatched += 1;
        break;
    }
  }

  const metricsByKey = new Map(
    metricsRows.map((r) => [
      campaignKey(r.google_ads_account_id, r.external_campaign_id),
      {
        spend: Number(r.spend),
        clicks: Number(r.clicks),
        impressions: Number(r.impressions),
      },
    ])
  );

  const campaignByKey = new Map(
    campaignRows.map((r) => [
      campaignKey(r.google_ads_account_id, r.external_campaign_id),
      {
        googleAdsAccountId: r.google_ads_account_id,
        accountExternalId: r.account_external_id,
        externalCampaignId: r.external_campaign_id,
        campaignName: r.campaign_name,
      },
    ])
  );

  const campaignList: CampaignAttributionRow[] = Array.from(
    campaignByKey.entries()
  ).map(([key, c]) => {
    const m = metricsByKey.get(key) ?? { spend: 0, clicks: 0, impressions: 0 };
    const exact = exactCount.get(key) ?? 0;
    const name = nameCount.get(key) ?? 0;
    return {
      googleAdsAccountId: c.googleAdsAccountId,
      accountExternalId: c.accountExternalId,
      externalCampaignId: c.externalCampaignId,
      campaignName: c.campaignName,
      exactMatchLeadCount: exact,
      nameMatchLeadCount: name,
      attributedLeadCount: exact + name,
      spend: m.spend,
      clicks: m.clicks,
      impressions: m.impressions,
    };
  });

  campaignList.sort((a, b) => {
    if (b.attributedLeadCount !== a.attributedLeadCount)
      return b.attributedLeadCount - a.attributedLeadCount;
    return b.spend - a.spend;
  });

  const summary: AttributionSummary = {
    totalExactMatch: campaignList.reduce((s, r) => s + r.exactMatchLeadCount, 0),
    totalNameMatch: campaignList.reduce((s, r) => s + r.nameMatchLeadCount, 0),
    totalAmbiguous,
    totalUnmatched,
  };

  return { campaigns: campaignList, summary };
}
