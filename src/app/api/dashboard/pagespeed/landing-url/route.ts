/**
 * GET /api/dashboard/pagespeed/landing-url — retorna URL da landing do tenant.
 * PATCH /api/dashboard/pagespeed/landing-url — define URL (body: { url: string | null }).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireDashboardApiAuth } from "@/server/dashboard/api-auth";
import { dashboardApiAuthErrorResponse } from "@/server/dashboard/api-route-errors";
import { PERMISSION_SLUGS } from "@/server/rbac";
import {
  getLandingPageUrlForTenant,
  setLandingPageUrlForTenant,
} from "@/server/dashboard";

export async function GET(request: NextRequest) {
  let session;
  try {
    session = await requireDashboardApiAuth(request, PERMISSION_SLUGS.DASHBOARD_READ);
  } catch (err) {
    return dashboardApiAuthErrorResponse(err);
  }

  const tenantId = session.session.currentTenantId!;

  const url = await getLandingPageUrlForTenant(tenantId);
  return NextResponse.json({ url });
}

export async function PATCH(request: NextRequest) {
  let session;
  try {
    session = await requireDashboardApiAuth(request, PERMISSION_SLUGS.LEADS_WRITE);
  } catch (err) {
    return dashboardApiAuthErrorResponse(err);
  }

  const tenantId = session.session.currentTenantId!;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const url =
    body.url === null || body.url === undefined
      ? null
      : typeof body.url === "string"
        ? body.url.trim() || null
        : null;

  await setLandingPageUrlForTenant(tenantId, url);
  return NextResponse.json({ ok: true, url });
}
