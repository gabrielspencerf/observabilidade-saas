/**
 * POST /api/webhooks/typebot/[botId]
 * Recebe webhook Typebot; valida (bot + secret); persiste raw event; enfileira job.
 * Não exige autenticação de usuário; identificação por URL/secret. Ver docs/BASE2_ETAPA1.md.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateTypebotWebhook,
  parseTypebotWebhookBody,
  ingestTypebotWebhook,
} from "@/server/integrations/typebot";
import { checkRateLimit } from "@/server/security/rate-limit";
import { setDbAccessContext } from "@/server/db/access-context";
import { checkWebhookReplay } from "@/server/security/webhook-replay";

const MAX_BODY_SIZE = 512 * 1024; // 512 KB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const { botId } = await params;
  const botIdOrToken = botId ?? request.nextUrl.searchParams.get("bot") ?? "";

  if (!botIdOrToken) {
    return NextResponse.json(
      { error: "Bot identifier required" },
      { status: 400 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { error: "Content-Type must be application/json" },
      { status: 415 }
    );
  }

  const rateLimit = await checkRateLimit({
    request,
    bucket: "webhook:typebot",
    max: 120,
    windowSeconds: 60,
    resourceKey: botIdOrToken,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  let body: unknown;
  let rawBody = "";
  try {
    rawBody = await request.text();
    if (rawBody.length > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413 }
      );
    }
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const context = await validateTypebotWebhook(request, botIdOrToken, rawBody);
  if ("error" in context) {
    return NextResponse.json(
      { error: context.error },
      { status: context.status }
    );
  }

  await setDbAccessContext({
    tenantId: context.tenantId,
    bypassRls: false,
  });

  const parsed = parseTypebotWebhookBody(body);
  if ("error" in parsed) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400 }
    );
  }

  const replay = await checkWebhookReplay({
    provider: "typebot",
    resourceId: context.typebotBotId,
    externalEventId: parsed.externalEventId,
    timestampHeader: request.headers.get("x-webhook-timestamp"),
    signatureHeader: request.headers.get("x-webhook-signature"),
    rawBody,
  });
  if (!replay.ok) {
    return NextResponse.json({ error: "Webhook replay detectado" }, { status: 409 });
  }

  const result = await ingestTypebotWebhook({
    tenantId: context.tenantId,
    typebotBotId: context.typebotBotId,
    payload: parsed.payload,
    externalEventId: parsed.externalEventId,
  });

  if ("error" in result) {
    if (result.error === "Not implemented") {
      return NextResponse.json(
        { error: "Webhook ingestion not implemented yet" },
        { status: 501 }
      );
    }
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { received: true, id: result.rawEventId },
    { status: 200 }
  );
}
