import type {
  SendVysenChatParams,
  SendVysenChatResult,
} from "@/features/vysen-chat/model/types";
import { dashboardPostJson } from "@/features/shared/api/dashboard-api-client";

export async function sendVysenChatMessage({
  endpoint,
  question,
  contextArea,
  history,
  memoryContext,
}: SendVysenChatParams): Promise<SendVysenChatResult> {
  const response = await dashboardPostJson<SendVysenChatResult>(endpoint, {
    question,
    contextArea,
    history,
    memoryContext,
  });

  if (response.error) {
    return {
      error: response.error.message || "Falha ao consultar a Vysen.",
    };
  }
  return response.data ?? { error: "Falha ao consultar a Vysen." };
}
