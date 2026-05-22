export interface ChatwootParsedPayload {
  eventType: string;
  payload: Record<string, unknown>;
  externalEventId: string | null;
}

function stringOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

export function parseChatwootWebhookBody(
  body: unknown
): ChatwootParsedPayload | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid body" };
  }
  const obj = body as Record<string, unknown>;

  // Chatwoot envia event no campo "event" (ex.: "conversation_created", "message_created")
  const eventType =
    stringOrNull(obj.event) ?? stringOrNull(obj.type) ?? "unknown";

  // ID externo: id da mensagem ou da conversa dependendo do evento
  let externalEventId: string | null = null;
  if (obj.id != null) {
    externalEventId = stringOrNull(String(obj.id));
  } else if (typeof obj.message === "object" && obj.message !== null) {
    const msg = obj.message as Record<string, unknown>;
    externalEventId = stringOrNull(String(msg.id ?? ""));
  }

  return {
    eventType,
    payload: obj,
    externalEventId,
  };
}
