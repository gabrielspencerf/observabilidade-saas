import { NextRequest, NextResponse } from "next/server";
import { authFeatures } from "@/server/auth";
import { buildGoogleAuthUrl, createGoogleState } from "@/server/auth/google-oauth";
import { sanitizeOAuthRedirect } from "@/server/security/redirect-policy";

export async function GET(request: NextRequest) {
  if (!authFeatures.googleLoginEnabled) {
    return NextResponse.redirect(new URL("/login?error=google_disabled", request.url));
  }

  const from = sanitizeOAuthRedirect(
    request.nextUrl.searchParams.get("from"),
    "/dashboard",
    ["/dashboard", "/admin"]
  );
  const remember = request.nextUrl.searchParams.get("remember") === "1";
  const isAdmin = request.nextUrl.searchParams.get("admin") === "1";
  const state = createGoogleState({ from, remember, isAdmin });

  try {
    const url = buildGoogleAuthUrl(state);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(new URL("/login?error=google_config", request.url));
  }
}
