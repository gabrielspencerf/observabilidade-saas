import { createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { env } from "@/config/env";
import { getDb } from "@/server/db";
import { whatsappCloudNumbers } from "@/db/schema";

export interface WhatsappCloudWebhookContext {
  tenantId: string;
  whatsappCloudNumberId: string;
}

export interface WhatsappCloudVerifyChallenge {
  challenge: string;
}

function verifyHmacSha256(appSecret: string, rawBody: string, signatureHeader: string): boolean {
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.replace(/^sha256=/, "").toLowerCase().trim();
  if (!provided) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Verifica hub challenge (GET). Retorna { challenge } ou { error, status }. */
export async function verifyWhatsappCloudHub(
  numberId: string,
  mode: string | null,
  token: string | null,
  challenge: string | null
): Promise<WhatsappCloudVerifyChallenge | { error: string; status: number }> {
  if (mode !== "subscribe") {
    return { error: "Invalid hub.mode", status: 403 };
  }
  if (!challenge) {
    return { error: "Missing hub.challenge", status: 400 };
  }

  const db = getDb();
  const [number] = await db
    .select({ webhookVerifyToken: whatsappCloudNumbers.webhookVerifyToken })
    .from(whatsappCloudNumbers)
    .where(eq(whatsappCloudNumbers.id, numberId))
    .limit(1);

  if (!number) {
    return { error: "Number not found", status: 404 };
  }

  if (!number.webhookVerifyToken || number.webhookVerifyToken !== token) {
    return { error: "Invalid verify token", status: 403 };
  }

  return { challenge };
}

/** Valida POST de evento (HMAC-SHA256 via X-Hub-Signature-256). */
export async function validateWhatsappCloudWebhook(
  request: Request,
  numberId: string,
  rawBody: string,
  appSecret: string | undefined
): Promise<WhatsappCloudWebhookContext | { error: string; status: number }> {
  const trimmed = numberId.trim();
  if (!trimmed) {
    return { error: "Number identifier required", status: 400 };
  }

  const db = getDb();
  const [number] = await db
    .select({
      id: whatsappCloudNumbers.id,
      tenantId: whatsappCloudNumbers.tenantId,
    })
    .from(whatsappCloudNumbers)
    .where(eq(whatsappCloudNumbers.id, trimmed))
    .limit(1);

  if (!number) {
    return { error: "Number not found", status: 404 };
  }

  if (env.isProduction && !appSecret?.trim()) {
    return {
      error: "META_APP_SECRET não configurado no servidor",
      status: 503,
    };
  }

  if (appSecret?.trim()) {
    const signature = request.headers.get("x-hub-signature-256") ?? "";
    if (
      !signature ||
      !verifyHmacSha256(appSecret.trim(), rawBody, signature)
    ) {
      return { error: "Assinatura inválida", status: 403 };
    }
  }

  return {
    tenantId: number.tenantId,
    whatsappCloudNumberId: number.id,
  };
}
