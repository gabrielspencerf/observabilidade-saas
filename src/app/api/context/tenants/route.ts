/**
 * GET /api/context/tenants — lista os tenants em que o usuário tem membership (para troca de contexto).
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth";
import { getMembershipsForUser } from "@/server/tenancy/membership";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const memberships = await getMembershipsForUser(session.user.id);
  const tenants = memberships.map((m) => ({
    id: m.tenantId,
    name: m.tenantName,
    slug: m.tenantSlug,
    roleSlug: m.roleSlug,
  }));

  return NextResponse.json({
    tenants,
    currentTenantId: session.session.currentTenantId,
  });
}
