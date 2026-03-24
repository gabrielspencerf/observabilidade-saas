import type { JobClassifyConversation } from "@/workers/queue/types";
import { classifyConversationAndPersist } from "@/server/ai/commercial-agent";

export async function processClassifyConversation(
  job: JobClassifyConversation
): Promise<{ ok: true } | { error: string }> {
  const result = await classifyConversationAndPersist({
    tenantId: job.tenantId,
    conversationId: job.conversationId,
  });
  if (!result.ok) {
    // Eventos esperados de skip não entram como erro fatal.
    if (
      result.reason === "agent_disabled" ||
      result.reason === "missing_api_key" ||
      result.reason === "conversation_not_found"
    ) {
      return { ok: true };
    }
    return { error: result.reason };
  }
  return { ok: true };
}
