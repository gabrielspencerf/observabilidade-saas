/**
 * POST /api/admin/integrations/uazapi — criar instância UAZAPI (super_admin).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { createUazapiInstance } from "@/server/admin/integrations-create";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: e.status === 403 ? "Sem permissão" : "Não autenticado" },
      { status: e.status ?? 401 }
    );
  }

  const limiter = await checkRateLimit({
    request,
    bucket: "admin:create-uazapi",
    max: 30,
    windowSeconds: 60,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(limiter.retryAfterSeconds) },
      }
    );
  }

  let body: {
    tenant_id?: string;
    external_id?: string;
    base_url?: string;
    api_key?: string;
    instance_name?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const tenantId = body.tenant_id?.trim();
  const externalId = body.external_id?.trim();
  const baseUrl = body.base_url?.trim();
  if (!tenantId || !externalId || !baseUrl) {
    return NextResponse.json(
      { error: "tenant_id, external_id e base_url são obrigatórios" },
      { status: 400 }
    );
  }

  const result = await createUazapiInstance({
    tenantId,
    externalId,
    baseUrl,
    apiKey: body.api_key ?? null,
    instanceName: body.instance_name ?? null,
  });

  if ("error" in result) {
    const message = result.error ?? "Erro ao criar instância UAZAPI";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Já existe") ? 409 : 500 }
    );
  }

  return NextResponse.json({ ...result }, { status: 201 });
}
