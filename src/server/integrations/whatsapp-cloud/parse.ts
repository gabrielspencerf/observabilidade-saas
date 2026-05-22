export interface WhatsappCloudParsedPayload {
  eventType: string;
  payload: Record<string, unknown>;
  externalEventId: string | null;
}

function stringOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

export function parseWhatsappCloudWebhookBody(
  body: unknown
): WhatsappCloudParsedPayload | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid body" };
  }
  const obj = body as Record<string, unknown>;

  // Meta envia object="whatsapp_business_account" no root.
  const objectType = stringOrNull(obj.object) ?? "unknown";

  // entry[0].changes[0].value.messages[0].id como externalEventId de dedup
  let externalEventId: string | null = null;
  let eventType = objectType;

  try {
    const entries = Array.isArray(obj.entry) ? obj.entry : [];
    const firstEntry = entries[0] as Record<string, unknown> | undefined;
    const changes = Array.isArray(firstEntry?.changes) ? firstEntry.changes : [];
    const firstChange = changes[0] as Record<string, unknown> | undefined;
    const value = firstChange?.value as Record<string, unknown> | undefined;

    if (value) {
      const messages = Array.isArray(value.messages) ? value.messages : [];
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];

      if (messages.length > 0) {
        eventType = "messages";
        const firstMsg = messages[0] as Record<string, unknown>;
        externalEventId = stringOrNull(String(firstMsg.id ?? ""));
      } else if (statuses.length > 0) {
        eventType = "statuses";
        const firstStatus = statuses[0] as Record<string, unknown>;
        externalEventId = stringOrNull(String(firstStatus.id ?? ""));
      }
    }
  } catch {
    // payload inesperado — salva como-está sem dedup
  }

  return {
    eventType,
    payload: obj,
    externalEventId,
  };
}
