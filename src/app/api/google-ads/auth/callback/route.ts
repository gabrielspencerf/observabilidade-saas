/**
 * GET /api/google-ads/auth/callback
 * Callback OAuth: valida state (tenantId), troca code por tokens, obtém contas acessíveis,
 * armazena "pending" no Redis e redireciona para escolha de conta (connect).
 */

import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  verifySignedState,
  exchangeCodeForTokens,
  getAccessibleCustomers,
  encryptTokens,
} from "@/server/integrations/google-ads";
import { createRedisClient } from "@/server/redis";
import {
  PENDING_KEY_PREFIX,
  PENDING_TTL_SEC,
} from "@/server/google-ads-pending";

const CONNECT_PATH = "/dashboard/google-ads/connect";

function redirectWithError(request: NextRequest, code: string, message?: string) {
  const url = new URL("/dashboard/google-ads", request.url);
  url.searchParams.set("google_ads_error", code);
  if (message) url.searchParams.set("google_ads_message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    const description = searchParams.get("error_description") ?? undefined;
    console.warn("[google-ads] callback: OAuth error from provider", {
      error: errorParam,
      description: description ? "(redacted)" : undefined,
    });
    return redirectWithError(
      request,
      "oauth_denied",
      description ?? errorParam
    );
  }

  if (!code || !state) {
    return redirectWithError(request, "invalid_callback", "code ou state ausente");
  }

  const payload = verifySignedState(state);
  if (!payload) {
    console.warn("[google-ads] callback: state inválido ou expirado");
    return redirectWithError(request, "invalid_state", "State inválido ou expirado");
  }

  const tenantId = payload.tenantId;

  const tokens = await exchangeCodeForTokens(code);
  if ("error" in tokens) {
    console.warn("[google-ads] callback: exchange failed", {
      tenantId,
      error: tokens.error,
    });
    return redirectWithError(request, "exchange_failed", tokens.error);
  }

  const customers = await getAccessibleCustomers(tokens.accessToken);
  if ("error" in customers) {
    console.warn("[google-ads] callback: listAccessibleCustomers failed", {
      tenantId,
      error: customers.error,
    });
    return redirectWithError(request, "list_accounts_failed", customers.error);
  }

  if (customers.length === 0) {
    return redirectWithError(
      request,
      "no_accounts",
      "Nenhuma conta Google Ads acessível"
    );
  }

  let refreshEncrypted: string;
  let accessEncrypted: string;
  try {
    refreshEncrypted = encryptTokens(tokens.refreshToken);
    accessEncrypted = encryptTokens(tokens.accessToken);
  } catch (err) {
    console.error("[google-ads] callback: encrypt failed", {
      tenantId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return redirectWithError(request, "config_error", "Falha ao criptografar tokens");
  }

  const pendingToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  const pendingPayload = {
    tenantId,
    refreshTokenEncrypted: refreshEncrypted,
    accessTokenEncrypted: accessEncrypted,
    tokenExpiresAt: expiresAt.toISOString(),
    customerIds: customers,
  };

  const redis = createRedisClient();
  try {
    await redis.setex(
      PENDING_KEY_PREFIX + pendingToken,
      PENDING_TTL_SEC,
      JSON.stringify(pendingPayload)
    );
  } finally {
    redis.quit();
  }

  const url = new URL(CONNECT_PATH, request.url);
  url.searchParams.set("pending", pendingToken);
  return NextResponse.redirect(url);
}
