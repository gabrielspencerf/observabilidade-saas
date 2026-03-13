/**
 * Sync de métricas Google Ads por conta: runSyncForAccount(accountId).
 * Carrega conta, renova token se necessário, chama API, persiste sync_log e campaign_snapshots.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { googleAdsSyncLogs, campaignSnapshots } from "@/db/schema";
import { decryptTokens, encryptTokens } from "./config";
import { refreshAccessToken } from "./auth";
import { fetchCampaignMetrics } from "./client";
import {
  getGoogleAdsAccountById,
  updateAccountTokens,
  updateAccountCurrency,
  updateAccountSyncResult,
} from "./accounts";
import { getCustomerCurrency } from "./client";

const SYNC_DAYS_BACK = 7;
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000; // 1 minuto antes de expirar

export type SyncResult =
  | { ok: true; logId: string }
  | { ok: false; error: string; logId?: string };

/**
 * Executa sync para uma conta: log → refresh token se necessário → fetch métricas → upsert snapshots → atualiza log e conta.
 */
export async function runSyncForAccount(
  accountId: string
): Promise<SyncResult> {
  const db = getDb();
  const account = await getGoogleAdsAccountById(accountId);
  if (!account) {
    return { ok: false, error: "Conta não encontrada" };
  }

  const startedAt = new Date();
  const requestParams = { daysBack: SYNC_DAYS_BACK };

  const [logRow] = await db
    .insert(googleAdsSyncLogs)
    .values({
      tenantId: account.tenantId,
      googleAdsAccountId: accountId,
      syncStartedAt: startedAt,
      status: "running",
      requestParams,
    })
    .returning({ id: googleAdsSyncLogs.id });

  if (!logRow) {
    return { ok: false, error: "Falha ao criar log de sync", logId: undefined };
  }
  const logId = logRow.id;

  const finishLog = async (
    status: "success" | "partial" | "error",
    responseSummary?: Record<string, unknown>,
    errorMessage?: string
  ) => {
    await db
      .update(googleAdsSyncLogs)
      .set({
        syncFinishedAt: new Date(),
        status,
        responseSummary: responseSummary ?? null,
        errorMessage: errorMessage?.slice(0, 1024) ?? null,
      })
      .where(eq(googleAdsSyncLogs.id, logId));
  };

  let accessToken: string;
  try {
    const refreshToken = decryptTokens(account.refreshTokenEncrypted);
    const now = Date.now();
    const expiresAt = account.tokenExpiresAt?.getTime() ?? 0;
    if (
      !account.accessTokenEncrypted ||
      expiresAt - TOKEN_EXPIRY_BUFFER_MS < now
    ) {
      const refreshed = await refreshAccessToken(refreshToken);
      if ("error" in refreshed) {
        await finishLog("error", undefined, refreshed.error);
        await updateAccountSyncResult(accountId, {
          lastSyncError: refreshed.error,
        });
        return { ok: false, error: refreshed.error, logId };
      }
      const expiresAtNew = new Date(
        Date.now() + refreshed.expiresIn * 1000
      );
      const encrypted = encryptTokens(refreshed.accessToken);
      await updateAccountTokens(accountId, encrypted, expiresAtNew);
      accessToken = refreshed.accessToken;
    } else {
      accessToken = decryptTokens(account.accessTokenEncrypted);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishLog("error", undefined, msg);
    await updateAccountSyncResult(accountId, { lastSyncError: msg });
    return { ok: false, error: msg, logId };
  }

  const customerId = account.externalId;

  if (!account.currencyCode) {
    const currencyResult = await getCustomerCurrency(customerId, accessToken);
    if (typeof currencyResult === "string") {
      await updateAccountCurrency(accountId, currencyResult);
    }
  }

  const metricsResult = await fetchCampaignMetrics(customerId, accessToken, {
    daysBack: SYNC_DAYS_BACK,
  });

  if ("error" in metricsResult) {
    await finishLog("error", undefined, metricsResult.error);
    await updateAccountSyncResult(accountId, {
      lastSyncError: metricsResult.error,
    });
    return { ok: false, error: metricsResult.error, logId };
  }

  const rows = metricsResult;
  const now = new Date();
  let upserted = 0;

  try {
    for (const row of rows) {
      await db
        .insert(campaignSnapshots)
        .values({
          tenantId: account.tenantId,
          googleAdsAccountId: accountId,
          externalCampaignId: row.campaignId,
          campaignName: row.campaignName.slice(0, 255),
          periodStart: row.date,
          periodEnd: row.date,
          metrics: {
            impressions: row.impressions,
            clicks: row.clicks,
            costMicros: row.costMicros,
            cost: row.costMicros / 1_000_000,
          },
          syncedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            campaignSnapshots.tenantId,
            campaignSnapshots.googleAdsAccountId,
            campaignSnapshots.externalCampaignId,
            campaignSnapshots.periodStart,
          ],
          set: {
            campaignName: row.campaignName.slice(0, 255),
            periodEnd: row.date,
            metrics: {
              impressions: row.impressions,
              clicks: row.clicks,
              costMicros: row.costMicros,
              cost: row.costMicros / 1_000_000,
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
    await updateAccountSyncResult(accountId, { lastSyncError: msg });
    return { ok: false, error: msg, logId };
  }

  await finishLog("success", {
    rowsFetched: rows.length,
    snapshotsUpserted: upserted,
  });
  await updateAccountSyncResult(accountId, { lastSyncedAt: now });
  return { ok: true, logId };
}
