/**
 * Persiste snapshot JSON retornado pela Clarity Data Export API.
 */

import { getDb } from "@/server/db";
import { clarityInsightSnapshots } from "@/db/schema";
import { decryptClarityToken } from "@/server/integrations/meta-ads/config";
import { fetchClarityProjectLiveInsights } from "./sync";
import { getClarityConnectionById, updateClarityConnectionSyncResult } from "./accounts";

export type ClaritySyncResult =
  | { ok: true }
  | { ok: false; error: string };

export async function runClaritySyncForConnection(connectionId: string): Promise<ClaritySyncResult> {
  const conn = await getClarityConnectionById(connectionId);
  if (!conn) {
    return { ok: false, error: "Conexão não encontrada" };
  }

  let token: string;
  try {
    token = decryptClarityToken(conn.apiTokenEncrypted);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateClarityConnectionSyncResult(connectionId, { lastSyncError: msg });
    return { ok: false, error: msg };
  }

  const dimension1 = "URL";
  const payload = await fetchClarityProjectLiveInsights(token, {
    numOfDays: 3,
    dimension1,
  });

  if (payload && typeof payload === "object" && "error" in payload) {
    const err = (payload as { error: string }).error;
    await updateClarityConnectionSyncResult(connectionId, { lastSyncError: err });
    return { ok: false, error: err };
  }

  const db = getDb();
  const now = new Date();
  try {
    await db.insert(clarityInsightSnapshots).values({
      tenantId: conn.tenantId,
      clarityConnectionId: connectionId,
      numOfDays: 3,
      dimension1,
      payload,
      syncedAt: now,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateClarityConnectionSyncResult(connectionId, { lastSyncError: msg });
    return { ok: false, error: msg };
  }

  await updateClarityConnectionSyncResult(connectionId, { lastSyncedAt: now });
  return { ok: true };
}
