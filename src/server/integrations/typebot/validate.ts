/**
 * Validar request webhook Typebot: identificar bot + tenant; validar secret se configurado.
 * botId na URL = typebot_bots.id (UUID). Secret via header X-Webhook-Secret (hash SHA-256 comparado ao armazenado).
 */

import { eq } from "drizzle-orm";
import { env } from "@/config/env";
import { getDb } from "@/server/db";
import { typebotBots } from "@/db/schema";
import { verifyWebhookSecret } from "@/server/integrations/webhook-secret";
import { verifyWebhookSignature } from "@/server/security/webhook-signature";
import { getTypebotBotCredentials } from "./credentials";

export interface TypebotWebhookContext {
  tenantId: string;
  typebotBotId: string;
}

const WEBHOOK_SECRET_HEADER = "x-webhook-secret";

export async function validateTypebotWebhook(
  request: Request,
  botIdOrToken: string,
  rawBody: string
): Promise<TypebotWebhookContext | { error: string; status: number }> {
  const trimmed = botIdOrToken.trim();
  if (!trimmed) {
    return { error: "Bot identifier required", status: 400 };
  }

  const db = getDb();
  const [bot] = await db
    .select({
      id: typebotBots.id,
      tenantId: typebotBots.tenantId,
      webhookSecretHash: typebotBots.webhookSecretHash,
    })
    .from(typebotBots)
    .where(eq(typebotBots.id, trimmed))
    .limit(1);

  if (!bot) {
    return { error: "Bot not found", status: 404 };
  }

  const webhookSecretHash = bot.webhookSecretHash?.trim() || null;
  const credentials = await getTypebotBotCredentials(bot.id);

  const webhookSecret = credentials?.webhookSecret?.trim() || null;

  if (webhookSecret) {
    const signatureCheck = verifyWebhookSignature({
      timestampHeader: request.headers.get("x-webhook-timestamp"),
      signatureHeader: request.headers.get("x-webhook-signature"),
      rawBody,
      secret: webhookSecret,
    });
    if (!signatureCheck.ok) {
      return {
        error: signatureCheck.error,
        status: signatureCheck.status,
      };
    }
    return {
      tenantId: bot.tenantId,
      typebotBotId: bot.id,
    };
  }

  if (webhookSecretHash) {
    const headerSecret = request.headers.get(WEBHOOK_SECRET_HEADER)?.trim();
    if (!headerSecret) {
      return {
        error: "Webhook secret required",
        status: 401,
      };
    }
    if (!verifyWebhookSecret(headerSecret, webhookSecretHash)) {
      return { error: "Invalid webhook secret", status: 403 };
    }
    return {
      tenantId: bot.tenantId,
      typebotBotId: bot.id,
    };
  }

  if (env.isProduction) {
    return {
      error: "Bot sem segredo de webhook (assinatura ou hash) configurado",
      status: 503,
    };
  }

  return {
    tenantId: bot.tenantId,
    typebotBotId: bot.id,
  };
}
