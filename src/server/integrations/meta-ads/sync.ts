/**
 * Sync insights Meta por conta (últimos N dias).
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { metaAdsInsightSnapshots, metaAdsSyncLogs } from "@/db/schema";
import { decryptMetaTokens } from "./config";
import { fetchAccountInsightsByDay } from "./insights";
import { getMetaAdsAccountById, updateMetaAdsAccountSyncResult } from "./accounts";

const SYNC_DAYS_BACK = 7;

export type MetaSyncResult =
  | { ok: true; logId: string }
  | { ok: false; error: string; logId?: string };

function formatDateIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function runMetaSyncForAccount(accountId: string): Promise<MetaSyncResult> {
  const db = getDb();
  const account = await getMetaAdsAccountById(accountId);
  if (!account) {
    return { ok: false, error: "Conta não encontrada" };
  }

  const startedAt = new Date();
  const until = new Date();
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - SYNC_DAYS_BACK);
  const sinceStr = formatDateIso(since);
  const untilStr = formatDateIso(until);
  const requestParams = { daysBack: SYNC_DAYS_BACK, since: sinceStr, until: untilStr };

  const [logRow] = await db
    .insert(metaAdsSyncLogs)
    .values({
      tenantId: account.tenantId,
      metaAdsAccountId: accountId,
      syncStartedAt: startedAt,
      status: "running",
      requestParams,
    })
    .returning({ id: metaAdsSyncLogs.id });

  if (!logRow) {
    return { ok: false, error: "Falha ao criar log de sync" };
  }
  const logId = logRow.id;

  const finishLog = async (
    status: "success" | "partial" | "error",
    responseSummary?: Record<string, unknown>,
    errorMessage?: string
  ) => {
    await db
      .update(metaAdsSyncLogs)
      .set({
        syncFinishedAt: new Date(),
        status,
        responseSummary: responseSummary ?? null,
        errorMessage: errorMessage?.slice(0, 1024) ?? null,
      })
      .where(eq(metaAdsSyncLogs.id, logId));
  };

  let accessToken: string;
  try {
    accessToken = decryptMetaTokens(account.longLivedTokenEncrypted);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishLog("error", undefined, msg);
    await updateMetaAdsAccountSyncResult(accountId, { lastSyncError: msg });
    return { ok: false, error: msg, logId };
  }

  const metricsResult = await fetchAccountInsightsByDay(
    accessToken,
    account.externalId,
    sinceStr,
    untilStr
  );

  if ("error" in metricsResult) {
    await finishLog("error", undefined, metricsResult.error);
    await updateMetaAdsAccountSyncResult(accountId, { lastSyncError: metricsResult.error });
    return { ok: false, error: metricsResult.error, logId };
  }

  const rows = metricsResult;
  const now = new Date();
  let upserted = 0;

  try {
    for (const row of rows) {
      await db
        .insert(metaAdsInsightSnapshots)
        .values({
          tenantId: account.tenantId,
          metaAdsAccountId: accountId,
          insightDate: row.date,
          metrics: {
            spend: row.spend,
            impressions: row.impressions,
            clicks: row.clicks,
            reach: row.reach,
            raw: row.raw,
          },
          syncedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            metaAdsInsightSnapshots.tenantId,
            metaAdsInsightSnapshots.metaAdsAccountId,
            metaAdsInsightSnapshots.insightDate,
          ],
          set: {
            metrics: {
              spend: row.spend,
              impressions: row.impressions,
              clicks: row.clicks,
              reach: row.reach,
              raw: row.raw,
            },
            syncedAt: now,
          },
        });
      upserted += 1;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishLog(
      "partial",
      { rowsFetched: rows.length, rowsUpserted: upserted },
      msg
    );
    await updateMetaAdsAccountSyncResult(accountId, { lastSyncError: msg });
    return { ok: false, error: msg, logId };
  }

  await finishLog("success", {
    rowsFetched: rows.length,
    snapshotsUpserted: upserted,
  });
  await updateMetaAdsAccountSyncResult(accountId, { lastSyncedAt: now });
  return { ok: true, logId };
}
