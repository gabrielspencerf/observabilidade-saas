/**
 * Snapshots e conexões Clarity para o dashboard.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { clarityConnections, clarityInsightSnapshots } from "@/db/schema";
import { listClarityConnectionsForTenant } from "@/server/integrations/clarity/accounts";

export { listClarityConnectionsForTenant };

export interface ClaritySnapshotListRow {
  id: string;
  connectionId: string;
  connectionLabel: string | null;
  numOfDays: number;
  dimension1: string | null;
  syncedAt: Date;
  payloadPreview: string;
}

export async function listLatestClaritySnapshotsForTenant(
  tenantId: string,
  limit: number = 20
): Promise<ClaritySnapshotListRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: clarityInsightSnapshots.id,
      connectionId: clarityInsightSnapshots.clarityConnectionId,
      label: clarityConnections.label,
      numOfDays: clarityInsightSnapshots.numOfDays,
      dimension1: clarityInsightSnapshots.dimension1,
      payload: clarityInsightSnapshots.payload,
      syncedAt: clarityInsightSnapshots.syncedAt,
    })
    .from(clarityInsightSnapshots)
    .innerJoin(
      clarityConnections,
      eq(clarityInsightSnapshots.clarityConnectionId, clarityConnections.id)
    )
    .where(eq(clarityInsightSnapshots.tenantId, tenantId))
    .orderBy(desc(clarityInsightSnapshots.syncedAt))
    .limit(Math.min(100, Math.max(1, limit)));

  return rows.map((r) => {
    let preview = "";
    try {
      preview = JSON.stringify(r.payload).slice(0, 500);
      if (preview.length >= 500) preview += "…";
    } catch {
      preview = "(payload inválido)";
    }
    return {
      id: r.id,
      connectionId: r.connectionId,
      connectionLabel: r.label,
      numOfDays: r.numOfDays,
      dimension1: r.dimension1,
      syncedAt: r.syncedAt,
      payloadPreview: preview,
    };
  });
}

export async function countClaritySnapshotsForConnection(
  tenantId: string,
  connectionId: string
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(clarityInsightSnapshots)
    .where(
      and(
        eq(clarityInsightSnapshots.tenantId, tenantId),
        eq(clarityInsightSnapshots.clarityConnectionId, connectionId)
      )
    );
  return row?.n ?? 0;
}
