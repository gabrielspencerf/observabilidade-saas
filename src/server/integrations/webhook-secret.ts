/**
 * Validação e hashing de secret para webhooks.
 * Typebot: secret no header X-Webhook-Secret; armazenamos SHA-256 hex em typebot_bots.webhook_secret_hash.
 * Nunca logar o secret em claro.
 */

import { createHash, timingSafeEqual } from "crypto";

/**
 * Gera o hash a ser armazenado em typebot_bots.webhook_secret_hash.
 * Ao configurar o webhook no Typebot, o mesmo valor (em claro) deve ser enviado no header X-Webhook-Secret.
 */
export function hashWebhookSecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

/**
 * Comparação em tempo constante do secret recebido com o hash armazenado.
 */
export function verifyWebhookSecret(secretFromHeader: string, storedHash: string): boolean {
  const computed = createHash("sha256").update(secretFromHeader, "utf8").digest("hex");
  if (computed.length !== storedHash.length) return false;
  return timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(storedHash, "utf8"));
}
