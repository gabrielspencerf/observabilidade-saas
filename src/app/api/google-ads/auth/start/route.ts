/**
 * GET /api/google-ads/auth/start
 * Inicia o fluxo OAuth: exige sessão e tenant atual; redireciona para Google com state assinado (tenantId).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth";
import { getCurrentMembership } from "@/server/tenancy/membership";
import {
  getGoogleAdsClientId,
  getGoogleAdsRedirectUri,
  getGoogleAdsScope,
  getGoogleOAuthAuthUrl,
  createSignedState,
} from "@/server/integrations/google-ads";

const DASHBOARD_HOME = "/dashboard/home";
const LOGIN_REDIRECT = "/login?from=/dashboard/home";

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? "";
  const req = new Request(request.url, {
    headers: cookie ? { cookie } : {},
  });
  const session = await getCurrentSession(req);

  if (!session) {
    return NextResponse.redirect(new URL(LOGIN_REDIRECT, request.url));
  }

  const currentTenantId = session.session.currentTenantId;
  if (!currentTenantId) {
    return NextResponse.redirect(
      new URL("/dashboard/context", request.url)
    );
  }

  const membership = await getCurrentMembership(
    session.user.id,
    currentTenantId
  );
  if (!membership) {
    return NextResponse.redirect(
      new URL("/dashboard/context", request.url)
    );
  }

  let state: string;
  try {
    state = createSignedState(currentTenantId);
  } catch (err) {
    console.error("[google-ads] auth/start: state creation failed", {
      tenantId: currentTenantId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.redirect(
      new URL(`${DASHBOARD_HOME}?google_ads_error=config`, request.url)
    );
  }

  const clientId = getGoogleAdsClientId();
  const redirectUri = getGoogleAdsRedirectUri();
  const scope = getGoogleAdsScope();
  const authUrl = getGoogleOAuthAuthUrl();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
    access_type: "offline",
    prompt: "consent",
  });

  const url = `${authUrl}?${params.toString()}`;
  return NextResponse.redirect(url);
}
