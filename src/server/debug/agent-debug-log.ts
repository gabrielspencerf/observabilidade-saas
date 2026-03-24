export interface AgentDebugPayload {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
}

/**
 * Telemetria opcional para depuração local. Sem efeito a menos que
 * `AGENT_DEBUG_INGEST_URL` esteja definida (ex.: endpoint de ingest).
 */
export function agentDebugLog(payload: AgentDebugPayload) {
  const url = process.env.AGENT_DEBUG_INGEST_URL;
  if (!url) return;
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
