/**
 * GET /api/meta-ads/auth/callback
 * Troca code por token long-lived, lista ad accounts, pending no Redis.
 */

import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyMetaSignedState,
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedUserToken,
  encryptMetaTokens,
  listAdAccounts,
} from "@/server/integrations/meta-ads";
import { createRedisClient } from "@/server/redis";
import { META_PENDING_KEY_PREFIX, META_PENDING_TTL_SEC } from "@/server/meta-ads-pending";

const CONNECT_PATH = "/dashboard/meta-ads/connect";

function redirectWithError(request: NextRequest, code: string, message?: string) {
  const url = new URL("/dashboard/meta-ads", request.url);
  url.searchParams.set("meta_ads_error", code);
  if (message) url.searchParams.set("meta_ads_message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    const description = searchParams.get("error_description") ?? undefined;
    console.warn("[meta-ads] callback: OAuth error", { error: errorParam });
    return redirectWithError(
      request,
      "oauth_denied",
      description ?? errorParam
    );
  }

  if (!code || !state) {
    return redirectWithError(request, "invalid_callback", "code ou state ausente");
  }

  const payload = verifyMetaSignedState(state);
  if (!payload) {
    console.warn("[meta-ads] callback: state inválido ou expirado");
    return redirectWithError(request, "invalid_state", "State inválido ou expirado");
  }

  const tenantId = payload.tenantId;

  const short = await exchangeCodeForShortLivedToken(code);
  if ("error" in short) {
    console.warn("[meta-ads] callback: short token failed", { tenantId, error: short.error });
    return redirectWithError(request, "exchange_failed", short.error);
  }

  const long = await exchangeForLongLivedUserToken(short.accessToken);
  if ("error" in long) {
    console.warn("[meta-ads] callback: long-lived failed", { tenantId, error: long.error });
    return redirectWithError(request, "exchange_failed", long.error);
  }

  const adAccounts = await listAdAccounts(long.accessToken);
  if ("error" in adAccounts) {
    console.warn("[meta-ads] callback: adaccounts failed", { tenantId, error: adAccounts.error });
    return redirectWithError(request, "list_accounts_failed", adAccounts.error);
  }

  if (adAccounts.length === 0) {
    return redirectWithError(
      request,
      "no_accounts",
      "Nenhuma conta de anúncios Meta acessível com este login"
    );
  }

  let tokenEncrypted: string;
  try {
    tokenEncrypted = encryptMetaTokens(long.accessToken);
  } catch (err) {
    console.error("[meta-ads] callback: encrypt failed", {
      tenantId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return redirectWithError(request, "config_error", "Falha ao criptografar token");
  }

  const expiresAt =
    long.expiresIn > 0
      ? new Date(Date.now() + long.expiresIn * 1000).toISOString()
      : null;

  const pendingToken = randomBytes(32).toString("hex");
  const pendingPayload = {
    tenantId,
    longLivedTokenEncrypted: tokenEncrypted,
    tokenExpiresAt: expiresAt,
    adAccounts,
  };

  const redis = createRedisClient();
  try {
    await redis.setex(
      META_PENDING_KEY_PREFIX + pendingToken,
      META_PENDING_TTL_SEC,
      JSON.stringify(pendingPayload)
    );
  } finally {
    redis.quit();
  }

  const url = new URL(CONNECT_PATH, request.url);
  url.searchParams.set("pending", pendingToken);
  return NextResponse.redirect(url);
}
