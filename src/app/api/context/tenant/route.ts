/**
 * POST /api/context/tenant — troca o tenant atual da sessão.
 * Body: { tenant_id: string }
 * Valida membership; atualiza current_tenant_id na sessão (não cria nova sessão).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { switchTenant } from "@/server/tenancy/switch";

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAuth(request);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: "Não autenticado" },
      { status: e.status ?? 401 }
    );
  }

  let body: { tenant_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo inválido" },
      { status: 400 }
    );
  }

  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id.trim() : "";
  if (!tenantId) {
    return NextResponse.json(
      { error: "tenant_id é obrigatório" },
      { status: 400 }
    );
  }

  const result = await switchTenant(
    session.session.id,
    session.session.userId,
    tenantId
  );

  if (!result.ok) {
    if (result.error === "forbidden") {
      return NextResponse.json(
        { error: "Você não tem acesso a este tenant" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Não foi possível trocar o tenant" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
