import { NextRequest, NextResponse } from "next/server";
import { requireDashboardApiAuth } from "@/server/dashboard/api-auth";
import { dashboardApiAuthErrorResponse } from "@/server/dashboard/api-route-errors";
import { PERMISSION_SLUGS } from "@/server/rbac";
import { deleteClarityConnection } from "@/server/integrations/clarity/accounts";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireDashboardApiAuth(request, PERMISSION_SLUGS.DASHBOARD_READ);
  } catch (err) {
    return dashboardApiAuthErrorResponse(err);
  }

  const tenantId = session.session.currentTenantId!;
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const ok = await deleteClarityConnection(tenantId, id);
  if (!ok) {
    return NextResponse.json({ error: "Conexão não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
