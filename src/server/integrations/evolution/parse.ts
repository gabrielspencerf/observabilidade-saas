/**
 * Extrair event_type e payload do body do webhook Evolution.
 * Entrada: body (JSON); saída: { eventType, payload, externalEventId? } ou erro.
 * externalEventId para dedup: data.key.id (mensagem) ou combinação instance+timestamp quando aplicável.
 * Ver docs/BASE2_ETAPA1.md.
 */

export interface EvolutionParsedPayload {
  eventType: string;
  payload: Record<string, unknown>;
  externalEventId: string | null;
}

function stringOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

export function parseEvolutionWebhookBody(
  body: unknown
): EvolutionParsedPayload | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid body" };
  }
  const obj = body as Record<string, unknown>;
  const eventType = typeof obj.event === "string" ? obj.event : "unknown";

  let externalEventId: string | null = null;
  const data = obj.data as Record<string, unknown> | undefined;
  const key = data?.key as Record<string, unknown> | undefined;
  if (key && typeof key === "object") {
    const messageId = stringOrNull(key.id);
    if (messageId) externalEventId = messageId;
  }
  if (!externalEventId && typeof obj.id === "string") {
    externalEventId = obj.id.trim() || null;
  }

  return {
    eventType,
    payload: obj as Record<string, unknown>,
    externalEventId,
  };
}
