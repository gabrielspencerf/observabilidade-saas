/**
 * clarity_connections: CRUD mínimo para o dashboard.
 */

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { clarityConnections } from "@/db/schema";
import { encryptClarityToken } from "@/server/integrations/meta-ads/config";

export interface ClarityConnectionRow {
  id: string;
  label: string | null;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
}

export async function listClarityConnectionsForTenant(
  tenantId: string
): Promise<ClarityConnectionRow[]> {
  const db = getDb();
  return db
    .select({
      id: clarityConnections.id,
      label: clarityConnections.label,
      lastSyncedAt: clarityConnections.lastSyncedAt,
      lastSyncError: clarityConnections.lastSyncError,
    })
    .from(clarityConnections)
    .where(eq(clarityConnections.tenantId, tenantId))
    .orderBy(desc(clarityConnections.createdAt));
}

export async function createClarityConnection(input: {
  tenantId: string;
  apiToken: string;
  label?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const token = input.apiToken.trim();
  if (!token) return { error: "Token obrigatório" };
  const db = getDb();
  let encrypted: string;
  try {
    encrypted = encryptClarityToken(token);
  } catch {
    return { error: "Falha ao criptografar token (verifique META_ADS_ENCRYPTION_KEY)" };
  }
  const [row] = await db
    .insert(clarityConnections)
    .values({
      tenantId: input.tenantId,
      label: input.label?.trim() || null,
      apiTokenEncrypted: encrypted,
    })
    .returning({ id: clarityConnections.id });
  if (!row) return { error: "Falha ao salvar conexão" };
  return { id: row.id };
}

export async function deleteClarityConnection(
  tenantId: string,
  connectionId: string
): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .delete(clarityConnections)
    .where(
      and(eq(clarityConnections.id, connectionId), eq(clarityConnections.tenantId, tenantId))
    )
    .returning({ id: clarityConnections.id });
  return rows.length > 0;
}

export async function getClarityConnectionById(
  connectionId: string
): Promise<{
  id: string;
  tenantId: string;
  apiTokenEncrypted: string;
} | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: clarityConnections.id,
      tenantId: clarityConnections.tenantId,
      apiTokenEncrypted: clarityConnections.apiTokenEncrypted,
    })
    .from(clarityConnections)
    .where(eq(clarityConnections.id, connectionId))
    .limit(1);
  return row ?? null;
}

export async function updateClarityConnectionSyncResult(
  connectionId: string,
  result: { lastSyncedAt: Date } | { lastSyncError: string }
): Promise<void> {
  const db = getDb();
  const set =
    "lastSyncedAt" in result
      ? { lastSyncedAt: result.lastSyncedAt, lastSyncError: null, updatedAt: new Date() }
      : {
          lastSyncError: result.lastSyncError.slice(0, 1024),
          updatedAt: new Date(),
        };
  await db.update(clarityConnections).set(set).where(eq(clarityConnections.id, connectionId));
}
