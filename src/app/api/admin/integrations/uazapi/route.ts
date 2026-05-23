/**
 * POST /api/admin/integrations/uazapi — criar instância UAZAPI (super_admin).
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { createUazapiInstance } from "@/server/admin/integrations-create";
import { checkRateLimit } from "@/server/security/rate-limit";
import { validateUazapiCredential } from "@/lib/uazapi-credentials";
import { adminApiAuthErrorResponse } from "@/server/admin/api-route-errors";
import { apiError, apiOk } from "@/server/http/api-contract";

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }

  const limiter = await checkRateLimit({
    request,
    bucket: "admin:create-uazapi",
    max: 30,
    windowSeconds: 60,
  });
  if (!limiter.allowed) {
    return apiError("rate_limited", "Muitas tentativas. Aguarde.", {
      status: 429,
      headers: { "Retry-After": String(limiter.retryAfterSeconds) },
    });
  }

  let body: {
    tenant_id?: string;
    external_id?: string;
    base_url?: string;
    api_key?: string;
    token?: string;
    admin_token?: string;
    instance_name?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Corpo inválido", { status: 400 });
  }

  const tenantId = body.tenant_id?.trim();
  const externalId = body.external_id?.trim();
  const baseUrl = body.base_url?.trim();
  if (!tenantId || !externalId || !baseUrl) {
    return apiError(
      "invalid_payload",
      "tenant_id, external_id e base_url são obrigatórios",
      { status: 400 }
    );
  }
  const credentialError = validateUazapiCredential({
    apiKey: body.api_key ?? null,
    token: body.token ?? null,
    adminToken: body.admin_token ?? null,
  });
  if (credentialError) {
    return apiError("invalid_payload", credentialError, { status: 400 });
  }

  const result = await createUazapiInstance({
    tenantId,
    externalId,
    baseUrl,
    apiKey: body.api_key ?? null,
    token: body.token ?? null,
    adminToken: body.admin_token ?? null,
    instanceName: body.instance_name ?? null,
    actorUserId: session.user.id,
  });

  if ("error" in result) {
    const message = result.error ?? "Erro ao criar instância UAZAPI";
    const duplicate = message.includes("Já existe");
    return apiError(duplicate ? "duplicate_resource" : "internal_error", message, {
      status: duplicate ? 409 : 500,
    });
  }

  return apiOk({ ...result }, { status: 201 });
}
