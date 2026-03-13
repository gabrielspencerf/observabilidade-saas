/**
 * Extrair payload e external_event_id do body do webhook Typebot.
 * Typebot pode enviar resultId, submissionId ou id no payload como identificador único.
 */

export interface TypebotParsedPayload {
  payload: Record<string, unknown>;
  externalEventId: string | null;
}

function stringOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

export function parseTypebotWebhookBody(
  body: unknown
): TypebotParsedPayload | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid body" };
  }
  const obj = body as Record<string, unknown>;
  const externalEventId =
    stringOrNull(obj.resultId) ??
    stringOrNull(obj.submissionId) ??
    stringOrNull(obj.result_id) ??
    stringOrNull(obj.submission_id) ??
    stringOrNull(obj.id) ??
    null;
  return {
    payload: obj,
    externalEventId,
  };
}
