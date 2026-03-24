/**
 * Listagens Meta Ads para o dashboard (sem tokens).
 */

import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { metaAdsAccounts, metaAdsInsightSnapshots } from "@/db/schema";

export interface MetaAdsAccountListRow {
  id: string;
  externalId: string;
  label: string | null;
  currencyCode: string | null;
  pixelId: string | null;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  tokenExpiresAt: Date | null;
}

export async function listMetaAdsAccountsForTenant(
  tenantId: string
): Promise<MetaAdsAccountListRow[]> {
  const db = getDb();
  return db
    .select({
      id: metaAdsAccounts.id,
      externalId: metaAdsAccounts.externalId,
      label: metaAdsAccounts.label,
      currencyCode: metaAdsAccounts.currencyCode,
      pixelId: metaAdsAccounts.pixelId,
      lastSyncedAt: metaAdsAccounts.lastSyncedAt,
      lastSyncError: metaAdsAccounts.lastSyncError,
      tokenExpiresAt: metaAdsAccounts.tokenExpiresAt,
    })
    .from(metaAdsAccounts)
    .where(eq(metaAdsAccounts.tenantId, tenantId))
    .orderBy(desc(metaAdsAccounts.lastSyncedAt));
}

export interface MetaInsightSnapshotRow {
  id: string;
  metaAdsAccountId: string;
  accountExternalId: string;
  insightDate: string;
  spend: number;
  impressions: number;
  clicks: number;
  syncedAt: Date;
}

export interface ListMetaInsightSnapshotsOptions {
  accountId?: string;
  periodFrom?: string;
  periodTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ListMetaInsightSnapshotsResult {
  items: MetaInsightSnapshotRow[];
  total: number;
}

export async function listMetaInsightSnapshotsForTenant(
  tenantId: string,
  options: ListMetaInsightSnapshotsOptions = {}
): Promise<ListMetaInsightSnapshotsResult> {
  const db = getDb();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, options.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const conditions = [eq(metaAdsInsightSnapshots.tenantId, tenantId)];
  if (options.accountId) {
    conditions.push(eq(metaAdsInsightSnapshots.metaAdsAccountId, options.accountId));
  }
  if (options.periodFrom) {
    conditions.push(gte(metaAdsInsightSnapshots.insightDate, options.periodFrom));
  }
  if (options.periodTo) {
    conditions.push(lte(metaAdsInsightSnapshots.insightDate, options.periodTo));
  }
  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [countRow, rows] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(metaAdsInsightSnapshots)
      .where(whereClause),
    db
      .select({
        id: metaAdsInsightSnapshots.id,
        metaAdsAccountId: metaAdsInsightSnapshots.metaAdsAccountId,
        accountExternalId: metaAdsAccounts.externalId,
        insightDate: metaAdsInsightSnapshots.insightDate,
        metrics: metaAdsInsightSnapshots.metrics,
        syncedAt: metaAdsInsightSnapshots.syncedAt,
      })
      .from(metaAdsInsightSnapshots)
      .innerJoin(metaAdsAccounts, eq(metaAdsInsightSnapshots.metaAdsAccountId, metaAdsAccounts.id))
      .where(whereClause)
      .orderBy(desc(metaAdsInsightSnapshots.insightDate), desc(metaAdsInsightSnapshots.syncedAt))
      .limit(pageSize)
      .offset(offset),
  ]);

  const total = countRow[0]?.value ?? 0;
  const items: MetaInsightSnapshotRow[] = rows.map((r) => {
    const m = (r.metrics ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      metaAdsAccountId: r.metaAdsAccountId,
      accountExternalId: r.accountExternalId,
      insightDate: String(r.insightDate),
      spend: Number(m.spend ?? 0),
      impressions: Number(m.impressions ?? 0),
      clicks: Number(m.clicks ?? 0),
      syncedAt: r.syncedAt,
    };
  });

  return { items, total };
}
