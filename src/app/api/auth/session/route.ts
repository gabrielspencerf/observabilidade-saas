/**
 * GET /api/auth/session — retorna a sessão atual (user + tenant) para o cliente.
 * 200 + { user, tenant } ou 401 se não autenticado.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession(request);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    tenant: session.tenant
      ? {
          id: session.tenant.id,
          name: session.tenant.name,
          slug: session.tenant.slug,
        }
      : null,
  });
}
