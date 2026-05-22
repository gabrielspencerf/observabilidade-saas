import { createHash } from "crypto";
import { getSharedRedis } from "@/server/redis";

export interface CheckWebhookReplayInput {
  provider: "typebot" | "evolution" | "uazapi" | "chatwoot" | "whatsapp_cloud";
  resourceId: string;
  externalEventId?: string | null;
  timestampHeader?: string | null;
  signatureHeader?: string | null;
  rawBody: string;
}

function fingerprint(input: CheckWebhookReplayInput): string {
  const base =
    input.externalEventId?.trim() ||
    `${input.timestampHeader ?? ""}|${input.signatureHeader ?? ""}|${input.rawBody}`;
  return createHash("sha256").update(base, "utf8").digest("hex");
}

/**
 * Anti-replay com janela de 10 min usando `SET NX EX` no Redis (singleton).
 *
 * Se Redis estiver indisponível, retorna `{ ok: true }` com log de warning para
 * NÃO bloquear ingestão de webhooks. A dedup por unique constraint nas tabelas
 * de raw event (`*_webhook_events_dedup_unique` em `external_event_id`) ainda
 * fecha o vetor a jusante: o processador não cria efeito colateral duplicado.
 *
 * Em outras palavras: Redis-replay é defesa em profundidade contra eventos
 * idênticos sem `external_event_id` (Typebot ocasional); falha de Redis
 * degrada para "depende do DB unique".
 */
export async function checkWebhookReplay(
  input: CheckWebhookReplayInput
): Promise<{ ok: true } | { ok: false }> {
  const fp = fingerprint(input);
  const key = `webhook:replay:${input.provider}:${input.resourceId}:${fp}`;

  try {
    const redis = getSharedRedis();
    const result = await redis.set(key, "1", "EX", 10 * 60, "NX");
    if (result !== "OK") return { ok: false };
    return { ok: true };
  } catch (err) {
    console.warn(
      "[webhook-replay] Redis indisponível — pulando dedup; DB unique constraint cobre",
      err instanceof Error ? err.message : String(err)
    );
    return { ok: true };
  }
}
