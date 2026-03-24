/**
 * GET /api/admin/tenants/[id] — obter tenant (super_admin).
 * PATCH /api/admin/tenants/[id] — atualizar tenant (super_admin).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { getTenantById, updateTenant } from "@/server/admin/tenants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: e.status === 403 ? "Sem permissão" : "Não autenticado" },
      { status: e.status ?? 401 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "ID do tenant é obrigatório" },
      { status: 400 }
    );
  }

  const tenant = await getTenantById(id);
  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant não encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json(tenant);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin(request);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: e.status === 403 ? "Sem permissão" : "Não autenticado" },
      { status: e.status ?? 401 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "ID do tenant é obrigatório" },
      { status: 400 }
    );
  }

  let body: {
    name?: string;
    slug?: string;
    is_active?: boolean;
    settings?: Record<string, unknown> | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo inválido" },
      { status: 400 }
    );
  }

  const result = await updateTenant(id, {
    name: body.name,
    slug: body.slug,
    isActive: body.is_active,
    settings: body.settings,
  });

  if ("error" in result) {
    if (result.error === "Tenant não encontrado") {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    const status =
      result.error.includes("obrigatório") || result.error.includes("longo")
        ? 400
        : 409;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
