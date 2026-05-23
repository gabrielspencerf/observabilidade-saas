/**
 * POST /api/admin/integrations/chatwoot — criar conta Chatwoot (super_admin).
 * GET — listar contas Chatwoot.
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { createChatwootAccount } from "@/server/admin/integrations-create";
import { checkRateLimit } from "@/server/security/rate-limit";
import { listChatwootAccounts } from "@/server/admin/integrations-stats";
import { adminApiAuthErrorResponse } from "@/server/admin/api-route-errors";
import { apiError, apiOk } from "@/server/http/api-contract";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }
  const accounts = await listChatwootAccounts();
  return apiOk({ accounts });
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }

  let body: {
    tenant_id?: string;
    external_id?: string;
    base_url?: string;
    inbox_id?: string;
    api_token?: string;
    label?: string;
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

  const limiter = await checkRateLimit({
    request,
    bucket: "admin:create-chatwoot",
    max: 30,
    windowSeconds: 60,
  });
  if (!limiter.allowed) {
    return apiError("rate_limited", "Muitas tentativas. Aguarde.", {
      status: 429,
      headers: { "Retry-After": String(limiter.retryAfterSeconds) },
    });
  }

  const result = await createChatwootAccount({
    tenantId,
    externalId,
    baseUrl,
    inboxId: body.inbox_id ?? null,
    apiToken: body.api_token ?? null,
    label: body.label ?? null,
    actorUserId: session.user.id,
  });

  if ("error" in result) {
    const message = result.error ?? "Erro ao criar conta Chatwoot";
    const duplicate = message.includes("Já existe");
    return apiError(duplicate ? "duplicate_resource" : "internal_error", message, {
      status: duplicate ? 409 : 500,
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const webhookUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/api/webhooks/chatwoot/${result.id}`
    : `[NEXT_PUBLIC_APP_URL]/api/webhooks/chatwoot/${result.id}`;

  return apiOk({ ...result, webhook_url: webhookUrl }, { status: 201 });
}
