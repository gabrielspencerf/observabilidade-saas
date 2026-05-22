/**
 * GET  /api/webhooks/whatsapp-cloud/[numberId] — verificação de hub Meta
 * POST /api/webhooks/whatsapp-cloud/[numberId] — eventos de mensagem/status
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";
import type { WhatsappCloudWebhookContext } from "@/server/integrations/whatsapp-cloud";
import {
  verifyWhatsappCloudHub,
  parseWhatsappCloudWebhookBody,
  ingestWhatsappCloudWebhook,
} from "@/server/integrations/whatsapp-cloud";
import { checkRateLimit } from "@/server/security/rate-limit";
import { withWebhookRlsTransaction } from "@/server/db/webhook-transaction";
import { validateWebhookRequest } from "@/server/security/webhook-request";
import { checkWebhookReplay } from "@/server/security/webhook-replay";
import { apiError, apiOk, webhookResponseHeaders } from "@/server/http/api-contract";
import { emitDomainEvent } from "@/server/observability/domain-events";

const MAX_BODY_SIZE = 512 * 1024;
const WEBHOOK_REPLAY_WINDOW_SECONDS = 10 * 60;

/** Hub verification — Meta chama GET para confirmar o endpoint. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ numberId: string }> }
) {
  const { numberId } = await params;
  const { searchParams } = request.nextUrl;

  const result = await verifyWhatsappCloudHub(
    numberId,
    searchParams.get("hub.mode"),
    searchParams.get("hub.verify_token"),
    searchParams.get("hub.challenge")
  );

  if ("error" in result) {
    return apiError("hub_verification_failed", result.error, { status: result.status });
  }

  return new NextResponse(result.challenge, {
    status: 200,
    headers: {
      "x-webhook-contract-version": "2026-04-26",
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ numberId: string }> }
) {
  const { numberId } = await params;

  if (!numberId) {
    return apiError("resource_required", "Number identifier required", { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return apiError("invalid_content_type", "Content-Type must be application/json", {
      status: 415,
    });
  }

  const rateLimit = await checkRateLimit({
    request,
    bucket: "webhook:whatsapp-cloud",
    max: 120,
    windowSeconds: 60,
    resourceKey: numberId,
  });
  if (!rateLimit.allowed) {
    return apiError("rate_limited", "Rate limit exceeded", {
      status: 429,
      headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
    });
  }

  let body: unknown;
  let rawBody = "";
  try {
    rawBody = await request.text();
    if (rawBody.length > MAX_BODY_SIZE) {
      return apiError("payload_too_large", "Payload too large", { status: 413 });
    }
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return apiError("invalid_json", "Invalid JSON body", { status: 400 });
  }

  return withWebhookRlsTransaction(async (lockToTenant) => {
    const context = await validateWebhookRequest(
      "whatsapp_cloud",
      request,
      rawBody,
      numberId,
      { metaAppSecret: env.metaAppSecret }
    );
    if ("error" in context) {
      return apiError("webhook_validation_failed", context.error, { status: context.status });
    }
    const whatsappContext = context as WhatsappCloudWebhookContext;

    await lockToTenant(whatsappContext.tenantId);

    const parsed = parseWhatsappCloudWebhookBody(body);
    if ("error" in parsed) {
      return apiError("invalid_payload", parsed.error, { status: 400 });
    }

    const replay = await checkWebhookReplay({
      provider: "whatsapp_cloud",
      resourceId: whatsappContext.whatsappCloudNumberId,
      externalEventId: parsed.externalEventId,
      signatureHeader: request.headers.get("x-hub-signature-256"),
      rawBody,
    });
    if (!replay.ok) {
      return apiError("replay_detected", "Webhook replay detectado", { status: 409 });
    }

    const result = await ingestWhatsappCloudWebhook({
      tenantId: whatsappContext.tenantId,
      whatsappCloudNumberId: whatsappContext.whatsappCloudNumberId,
      eventType: parsed.eventType,
      payload: parsed.payload,
      externalEventId: parsed.externalEventId,
    });

    if ("error" in result) {
      emitDomainEvent({
        name: "webhook.whatsapp_cloud.ingest_failed",
        level: "error",
        tenantId: whatsappContext.tenantId,
        metadata: {
          numberId: whatsappContext.whatsappCloudNumberId,
          reason: result.error,
          eventType: parsed.eventType,
        },
      });
      return apiError("ingest_failed", result.error, { status: 500 });
    }

    emitDomainEvent({
      name: "webhook.whatsapp_cloud.ingested",
      tenantId: whatsappContext.tenantId,
      metadata: {
        numberId: whatsappContext.whatsappCloudNumberId,
        rawEventId: result.rawEventId,
        eventType: parsed.eventType,
      },
    });
    return apiOk(
      { received: true, id: result.rawEventId },
      {
        headers: webhookResponseHeaders({
          eventId: parsed.externalEventId ?? result.rawEventId,
          replayWindowSeconds: WEBHOOK_REPLAY_WINDOW_SECONDS,
        }),
      }
    );
  });
}
