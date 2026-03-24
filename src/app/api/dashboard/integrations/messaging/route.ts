import { NextResponse } from "next/server";
import { requireDashboardApiAuth } from "@/server/dashboard/api-auth";
import { dashboardApiAuthErrorResponse } from "@/server/dashboard/api-route-errors";
import { listMessagingInstancesForTenant } from "@/server/dashboard/messaging-instances";
import { PERMISSION_SLUGS } from "@/server/rbac";

export async function GET(request: Request) {
  let session;
  try {
    session = await requireDashboardApiAuth(request, PERMISSION_SLUGS.DASHBOARD_READ);
  } catch (err) {
    return dashboardApiAuthErrorResponse(err);
  }

  const tenantId = session.session.currentTenantId!;
  const instances = await listMessagingInstancesForTenant(tenantId);
  return NextResponse.json({ instances });
}
