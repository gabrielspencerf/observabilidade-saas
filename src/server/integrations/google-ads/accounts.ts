/**
 * Persistência de contas Google Ads (google_ads_accounts).
 * Vincular conta ao tenant com tokens criptografados; limpar last_sync_error ao conectar.
 */

import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { googleAdsAccounts } from "@/db/schema";

export interface GoogleAdsAccountRow {
  id: string;
  tenantId: string;
  externalId: string;
  refreshTokenEncrypted: string;
  accessTokenEncrypted: string | null;
  tokenExpiresAt: Date | null;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  currencyCode: string | null;
}

export interface SaveGoogleAdsAccountInput {
  tenantId: string;
  externalId: string;
  refreshTokenEncrypted: string;
  accessTokenEncrypted: string;
  tokenExpiresAt: Date;
  label?: string | null;
}

/**
 * Insere ou atualiza conta por (tenant_id, external_id).
 * external_id = customer_id (sem hífens). Em sucesso: last_sync_error = null.
 * last_synced_at permanece null em insert; em update (reconexão) não altera para não perder histórico.
 */
export async function saveOrUpdateGoogleAdsAccount(
  input: SaveGoogleAdsAccountInput
): Promise<{ id: string } | { error: string }> {
  const db = getDb();

  const [existing] = await db
    .select({ id: googleAdsAccounts.id })
    .from(googleAdsAccounts)
    .where(
      and(
        eq(googleAdsAccounts.tenantId, input.tenantId),
        eq(googleAdsAccounts.externalId, input.externalId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(googleAdsAccounts)
      .set({
        refreshTokenEncrypted: input.refreshTokenEncrypted,
        accessTokenEncrypted: input.accessTokenEncrypted,
        tokenExpiresAt: input.tokenExpiresAt,
        lastSyncError: null,
        updatedAt: new Date(),
        ...(input.label !== undefined && { label: input.label }),
      })
      .where(eq(googleAdsAccounts.id, existing.id));
    return { id: existing.id };
  }

  const [inserted] = await db
    .insert(googleAdsAccounts)
    .values({
      tenantId: input.tenantId,
      externalId: input.externalId,
      refreshTokenEncrypted: input.refreshTokenEncrypted,
      accessTokenEncrypted: input.accessTokenEncrypted,
      tokenExpiresAt: input.tokenExpiresAt,
      label: input.label ?? null,
      lastSyncedAt: null,
      lastSyncError: null,
    })
    .returning({ id: googleAdsAccounts.id });

  if (!inserted) {
    return { error: "Falha ao inserir conta Google Ads" };
  }
  return { id: inserted.id };
}

/**
 * Carrega conta por id. Retorna null se não existir.
 */
export async function getGoogleAdsAccountById(
  accountId: string
): Promise<GoogleAdsAccountRow | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: googleAdsAccounts.id,
      tenantId: googleAdsAccounts.tenantId,
      externalId: googleAdsAccounts.externalId,
      refreshTokenEncrypted: googleAdsAccounts.refreshTokenEncrypted,
      accessTokenEncrypted: googleAdsAccounts.accessTokenEncrypted,
      tokenExpiresAt: googleAdsAccounts.tokenExpiresAt,
      lastSyncedAt: googleAdsAccounts.lastSyncedAt,
      lastSyncError: googleAdsAccounts.lastSyncError,
      currencyCode: googleAdsAccounts.currencyCode,
    })
    .from(googleAdsAccounts)
    .where(eq(googleAdsAccounts.id, accountId))
    .limit(1);
  if (!row) return null;
  return row;
}

/**
 * Atualiza access_token e token_expires_at após refresh (sync).
 */
export async function updateAccountTokens(
  accountId: string,
  accessTokenEncrypted: string,
  tokenExpiresAt: Date
): Promise<void> {
  const db = getDb();
  await db
    .update(googleAdsAccounts)
    .set({
      accessTokenEncrypted,
      tokenExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(googleAdsAccounts.id, accountId));
}

/**
 * Atualiza currency_code da conta (preenchido no sync a partir da API).
 */
export async function updateAccountCurrency(
  accountId: string,
  currencyCode: string
): Promise<void> {
  const db = getDb();
  await db
    .update(googleAdsAccounts)
    .set({
      currencyCode: currencyCode.slice(0, 8),
      updatedAt: new Date(),
    })
    .where(eq(googleAdsAccounts.id, accountId));
}

/**
 * Atualiza last_synced_at e last_sync_error após execução do sync.
 */
export async function updateAccountSyncResult(
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
  await db
    .update(googleAdsAccounts)
    .set(set)
    .where(eq(googleAdsAccounts.id, accountId));
}
