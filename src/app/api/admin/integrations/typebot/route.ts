/**
 * GET /api/admin/integrations/typebot — listar bots Typebot.
 * POST /api/admin/integrations/typebot — criar bot Typebot (super_admin).
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { createTypebotBot } from "@/server/admin/integrations-create";
import { checkRateLimit } from "@/server/security/rate-limit";
import { listTypebotBots } from "@/server/admin/integrations-stats";
import { adminApiAuthErrorResponse } from "@/server/admin/api-route-errors";
import { apiError, apiOk } from "@/server/http/api-contract";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }

  const bots = await listTypebotBots();
  return apiOk({
    bots: bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      externalId: bot.externalId,
      tenantId: bot.tenantId,
      tenantName: bot.tenantName,
    })),
  });
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
    name?: string;
    webhook_secret?: string;
    api_token?: string;
    metrics_api_base_url?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Corpo inválido", { status: 400 });
  }

  const tenantId = body.tenant_id?.trim();
  const externalId = body.external_id?.trim();
  if (!tenantId || !externalId) {
    return apiError(
      "invalid_payload",
      "tenant_id e external_id são obrigatórios",
      { status: 400 }
    );
  }

  const limiter = await checkRateLimit({
    request,
    bucket: "admin:create-typebot",
    max: 30,
    windowSeconds: 60,
  });
  if (!limiter.allowed) {
    return apiError("rate_limited", "Muitas tentativas. Aguarde.", {
      status: 429,
      headers: { "Retry-After": String(limiter.retryAfterSeconds) },
    });
  }

  const result = await createTypebotBot({
    tenantId,
    externalId,
    name: body.name ?? null,
    webhookSecret: body.webhook_secret ?? null,
    apiToken: body.api_token ?? null,
    metricsApiBaseUrl: body.metrics_api_base_url ?? null,
    actorUserId: session.user.id,
  });

  if ("error" in result) {
    const message = result.error ?? "Erro ao criar bot";
    const duplicate = message.includes("Já existe");
    return apiError(duplicate ? "duplicate_resource" : "internal_error", message, {
      status: duplicate ? 409 : 500,
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const webhookUrl = appUrl
    ? `${appUrl.replace(/\/$/, "")}/api/webhooks/typebot/${result.id}`
    : `[NEXT_PUBLIC_APP_URL]/api/webhooks/typebot/${result.id}`;

  return apiOk({ ...result, webhook_url: webhookUrl }, { status: 201 });
}
