/**
 * Listagem de contas Google Ads e snapshots de campanha por tenant.
 * Uso em páginas do dashboard; tenant sempre da sessão.
 */

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { googleAdsAccounts, campaignSnapshots } from "@/db/schema";

export interface GoogleAdsAccountRow {
  id: string;
  externalId: string;
  label: string | null;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  currencyCode: string | null;
}

/**
 * Lista contas Google Ads do tenant (sem tokens).
 */
export async function listGoogleAdsAccountsForTenant(
  tenantId: string
): Promise<GoogleAdsAccountRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: googleAdsAccounts.id,
      externalId: googleAdsAccounts.externalId,
      label: googleAdsAccounts.label,
      lastSyncedAt: googleAdsAccounts.lastSyncedAt,
      lastSyncError: googleAdsAccounts.lastSyncError,
      currencyCode: googleAdsAccounts.currencyCode,
    })
    .from(googleAdsAccounts)
    .where(eq(googleAdsAccounts.tenantId, tenantId))
    .orderBy(desc(googleAdsAccounts.lastSyncedAt));
  return rows;
}

export interface CampaignSnapshotRow {
  id: string;
  googleAdsAccountId: string;
  accountExternalId: string;
  accountCurrencyCode: string | null;
  campaignName: string;
  externalCampaignId: string;
  periodStart: string;
  periodEnd: string;
  impressions: number;
  clicks: number;
  cost: number;
  syncedAt: Date;
}

export interface ListCampaignSnapshotsOptions {
  accountId?: string;
  periodFrom?: string; // YYYY-MM-DD
  periodTo?: string;   // YYYY-MM-DD
  page?: number;      // 1-based
  pageSize?: number;
}

export interface ListCampaignSnapshotsResult {
  items: CampaignSnapshotRow[];
  total: number;
}

/**
 * Lista snapshots de campanha do tenant (métricas já persistidas) com filtros e paginação.
 * Join com google_ads_accounts para external_id e currency_code.
 */
export async function listCampaignSnapshotsForTenant(
  tenantId: string,
  options: ListCampaignSnapshotsOptions = {}
): Promise<ListCampaignSnapshotsResult> {
  const db = getDb();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, options.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const conditions = [eq(campaignSnapshots.tenantId, tenantId)];
  if (options.accountId) {
    conditions.push(
      eq(campaignSnapshots.googleAdsAccountId, options.accountId)
    );
  }
  if (options.periodFrom) {
    conditions.push(gte(campaignSnapshots.periodStart, options.periodFrom));
  }
  if (options.periodTo) {
    conditions.push(lte(campaignSnapshots.periodEnd, options.periodTo));
  }
  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [countRow, rows] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(campaignSnapshots)
      .where(whereClause),
    db
      .select({
        id: campaignSnapshots.id,
        googleAdsAccountId: campaignSnapshots.googleAdsAccountId,
        accountExternalId: googleAdsAccounts.externalId,
        accountCurrencyCode: googleAdsAccounts.currencyCode,
        campaignName: campaignSnapshots.campaignName,
        externalCampaignId: campaignSnapshots.externalCampaignId,
        periodStart: campaignSnapshots.periodStart,
        periodEnd: campaignSnapshots.periodEnd,
        metrics: campaignSnapshots.metrics,
        syncedAt: campaignSnapshots.syncedAt,
      })
      .from(campaignSnapshots)
      .innerJoin(
        googleAdsAccounts,
        eq(campaignSnapshots.googleAdsAccountId, googleAdsAccounts.id)
      )
      .where(whereClause)
      .orderBy(
        desc(campaignSnapshots.periodStart),
        desc(campaignSnapshots.syncedAt)
      )
      .limit(pageSize)
      .offset(offset),
  ]);

  const total = countRow[0]?.value ?? 0;

  const items: CampaignSnapshotRow[] = rows.map((r) => {
    const metrics = (r.metrics ?? {}) as Record<string, unknown>;
    const cost = Number(metrics.cost ?? metrics.costMicros ?? 0);
    const costValue =
      cost >= 1 ? cost : (Number(metrics.costMicros ?? 0) || 0) / 1_000_000;
    return {
      id: r.id,
      googleAdsAccountId: r.googleAdsAccountId,
      accountExternalId: r.accountExternalId,
      accountCurrencyCode: r.accountCurrencyCode,
      campaignName: r.campaignName,
      externalCampaignId: r.externalCampaignId,
      periodStart: String(r.periodStart),
      periodEnd: String(r.periodEnd),
      impressions: Number(metrics.impressions ?? 0),
      clicks: Number(metrics.clicks ?? 0),
      cost: costValue,
      syncedAt: r.syncedAt,
    };
  });

  return { items, total };
}
