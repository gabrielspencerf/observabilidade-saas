/**
 * GET /api/meta-ads/auth/start
 * Inicia OAuth Meta (Marketing API); state assinado com tenantId.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth";
import { getCurrentMembership } from "@/server/tenancy/membership";
import {
  createMetaSignedState,
  getMetaAdsAppId,
  getMetaAdsOAuthScope,
  getMetaAdsRedirectUri,
  graphApiBaseUrl,
} from "@/server/integrations/meta-ads";

const DASHBOARD_HOME = "/dashboard/home";
const LOGIN_REDIRECT = "/login?from=/dashboard/home";

function dialogOAuthUrl(): string {
  const v = graphApiBaseUrl().replace("https://graph.facebook.com/", "");
  return `https://www.facebook.com/${v}/dialog/oauth`;
}

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
    return NextResponse.redirect(new URL("/dashboard/context", request.url));
  }

  const membership = await getCurrentMembership(session.user.id, currentTenantId);
  if (!membership) {
    return NextResponse.redirect(new URL("/dashboard/context", request.url));
  }

  let state: string;
  let clientId: string;
  let redirectUri: string;
  try {
    state = createMetaSignedState(currentTenantId);
    clientId = getMetaAdsAppId();
    redirectUri = getMetaAdsRedirectUri();
  } catch (err) {
    console.error("[meta-ads] auth/start: config/state failed", {
      tenantId: currentTenantId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.redirect(
      new URL(`${DASHBOARD_HOME}?meta_ads_error=config`, request.url)
    );
  }

  const scope = getMetaAdsOAuthScope();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
  });

  const url = `${dialogOAuthUrl()}?${params.toString()}`;
  return NextResponse.redirect(url);
}
