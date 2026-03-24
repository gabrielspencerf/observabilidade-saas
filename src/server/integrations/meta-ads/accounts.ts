/**
 * Persistência meta_ads_accounts.
 */

import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { metaAdsAccounts } from "@/db/schema";

export interface MetaAdsAccountRow {
  id: string;
  tenantId: string;
  externalId: string;
  longLivedTokenEncrypted: string;
  tokenExpiresAt: Date | null;
  label: string | null;
  currencyCode: string | null;
  pixelId: string | null;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
}

export interface SaveMetaAdsAccountInput {
  tenantId: string;
  externalId: string;
  longLivedTokenEncrypted: string;
  tokenExpiresAt: Date | null;
  label?: string | null;
  currencyCode?: string | null;
}

export async function saveOrUpdateMetaAdsAccount(
  input: SaveMetaAdsAccountInput
): Promise<{ id: string } | { error: string }> {
  const db = getDb();
  const [existing] = await db
    .select({ id: metaAdsAccounts.id })
    .from(metaAdsAccounts)
    .where(
      and(
        eq(metaAdsAccounts.tenantId, input.tenantId),
        eq(metaAdsAccounts.externalId, input.externalId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(metaAdsAccounts)
      .set({
        longLivedTokenEncrypted: input.longLivedTokenEncrypted,
        tokenExpiresAt: input.tokenExpiresAt,
        lastSyncError: null,
        updatedAt: new Date(),
        ...(input.label !== undefined && { label: input.label }),
        ...(input.currencyCode !== undefined && {
          currencyCode: input.currencyCode?.slice(0, 8) ?? null,
        }),
      })
      .where(eq(metaAdsAccounts.id, existing.id));
    return { id: existing.id };
  }

  const [inserted] = await db
    .insert(metaAdsAccounts)
    .values({
      tenantId: input.tenantId,
      externalId: input.externalId,
      longLivedTokenEncrypted: input.longLivedTokenEncrypted,
      tokenExpiresAt: input.tokenExpiresAt,
      label: input.label ?? null,
      currencyCode: input.currencyCode?.slice(0, 8) ?? null,
      lastSyncedAt: null,
      lastSyncError: null,
    })
    .returning({ id: metaAdsAccounts.id });

  if (!inserted) {
    return { error: "Falha ao inserir conta Meta Ads" };
  }
  return { id: inserted.id };
}

export async function getMetaAdsAccountById(accountId: string): Promise<MetaAdsAccountRow | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: metaAdsAccounts.id,
      tenantId: metaAdsAccounts.tenantId,
      externalId: metaAdsAccounts.externalId,
      longLivedTokenEncrypted: metaAdsAccounts.longLivedTokenEncrypted,
      tokenExpiresAt: metaAdsAccounts.tokenExpiresAt,
      label: metaAdsAccounts.label,
      currencyCode: metaAdsAccounts.currencyCode,
      pixelId: metaAdsAccounts.pixelId,
      lastSyncedAt: metaAdsAccounts.lastSyncedAt,
      lastSyncError: metaAdsAccounts.lastSyncError,
    })
    .from(metaAdsAccounts)
    .where(eq(metaAdsAccounts.id, accountId))
    .limit(1);
  return row ?? null;
}

export async function updateMetaAdsAccountSyncResult(
  accountId: string,
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
  await db.update(metaAdsAccounts).set(set).where(eq(metaAdsAccounts.id, accountId));
}

export async function updateMetaAdsAccountPixelId(
  accountId: string,
  pixelId: string | null
): Promise<void> {
  const db = getDb();
  await db
    .update(metaAdsAccounts)
    .set({
      pixelId: pixelId?.trim() ? pixelId.trim().slice(0, 64) : null,
      updatedAt: new Date(),
    })
    .where(eq(metaAdsAccounts.id, accountId));
}
