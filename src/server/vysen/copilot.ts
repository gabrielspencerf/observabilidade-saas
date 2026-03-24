import { getGlobalOpenAIAgentApiKeyOnly, getGlobalOpenAIAgentConfig } from "@/server/config/openai-agent";
import {
  getVysenAdminInsights,
  getVysenTenantInsights,
} from "@/server/vysen/orchestrator";
import { searchKnowledge } from "@/server/vysen/knowledge";
import { runVysenTenantDataTool } from "@/server/vysen/tenant-data-tool";
import { logVysenUsage } from "@/server/vysen/usage";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export async function askVysenCopilot(input: {
  question: string;
  tenantId?: string | null;
  userId?: string | null;
  channel?: "admin" | "dashboard";
  contextArea?: string | null;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const question = input.question.trim();
  if (!question) {
    throw new Error("Pergunta vazia.");
  }
  const [apiKey, config, insights, globalKb, tenantKb, tenantTool] = await Promise.all([
    getGlobalOpenAIAgentApiKeyOnly(),
    getGlobalOpenAIAgentConfig(),
    input.tenantId
      ? getVysenTenantInsights({ tenantId: input.tenantId, periodDays: 30 })
      : getVysenAdminInsights(30),
    searchKnowledge({
      query: question,
      scope: "global",
      limit: 5,
    }).catch(() => []),
    input.tenantId
      ? searchKnowledge({
          query: question,
          scope: "tenant",
          tenantId: input.tenantId,
          limit: 5,
        }).catch(() => [])
      : Promise.resolve([]),
    input.tenantId ? runVysenTenantDataTool(input.tenantId).catch(() => null) : Promise.resolve(null),
  ]);
  if (!apiKey) {
    throw new Error("OpenAI API key não configurada para a Vysen.");
  }

  const references = [...tenantKb, ...globalKb].slice(0, 8);
  const contextJson = JSON.stringify(
    {
      insights,
      tenantDataTool: tenantTool,
      references: references.map((r) => ({
        title: r.title,
        sourceType: r.sourceType,
        sourceUri: r.sourceUri,
        score: r.score,
        excerpt: r.content.slice(0, 320),
      })),
    },
    null,
    2
  );

  const history = Array.isArray(input.history)
    ? input.history
        .filter(
          (item) =>
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string" &&
            item.content.trim().length > 0
        )
        .slice(-12)
        .map((item) => ({
          role: item.role,
          content: item.content.trim().slice(0, 1800),
        }))
    : [];
  const contextArea =
    typeof input.contextArea === "string" && input.contextArea.trim()
      ? input.contextArea.trim().toLowerCase()
      : "geral";

  let response: Response;
  try {
    response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: [
              "Você é a Vysen, capitã analista da operação comercial e de aquisição.",
              "Seja objetiva, consultiva e baseada em evidências.",
              "Você não responde cliente final nem atua como bot de WhatsApp.",
              "Seu foco: funil, aquisição, negociações, observabilidade, gargalos, melhorias e recomendações acionáveis.",
              `Priorize respostas para a área de contexto selecionada: ${contextArea}.`,
              "Sempre cite de forma curta quais evidências sustentam cada recomendação.",
            ].join("\n"),
          },
          ...history,
          {
            role: "user",
            content: [
              "Contexto estruturado:",
              contextJson,
              "",
              `Pergunta: ${question}`,
              "",
              "Responda em português com esta estrutura:",
              "1) diagnóstico",
              "2) gargalos",
              "3) ações recomendadas (priorizadas)",
              "4) riscos/observações",
            ].join("\n"),
          },
        ],
      }),
    });
  } catch (err) {
    await logVysenUsage({
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      channel: input.channel ?? (input.tenantId ? "dashboard" : "admin"),
      operation: "copilot_chat",
      model: config.model || "gpt-4o-mini",
      success: false,
      errorMessage: err instanceof Error ? err.message : "network_error",
    });
    throw err;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    await logVysenUsage({
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      channel: input.channel ?? (input.tenantId ? "dashboard" : "admin"),
      operation: "copilot_chat",
      model: config.model || "gpt-4o-mini",
      success: false,
      errorMessage: `http_${response.status}: ${body.slice(0, 180)}`,
    });
    throw new Error(`Falha ao consultar Vysen (${response.status}): ${body.slice(0, 180)}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) {
    await logVysenUsage({
      tenantId: input.tenantId ?? null,
      userId: input.userId ?? null,
      channel: input.channel ?? (input.tenantId ? "dashboard" : "admin"),
      operation: "copilot_chat",
      model: config.model || "gpt-4o-mini",
      success: false,
      errorMessage: "empty_response",
    });
    throw new Error("Resposta vazia da Vysen.");
  }
  await logVysenUsage({
    tenantId: input.tenantId ?? null,
    userId: input.userId ?? null,
    channel: input.channel ?? (input.tenantId ? "dashboard" : "admin"),
    operation: "copilot_chat",
    model: config.model || "gpt-4o-mini",
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
    totalTokens: data.usage?.total_tokens ?? 0,
    success: true,
  });
  return {
    answer,
    references: references.map((r) => ({
      title: r.title,
      sourceType: r.sourceType,
      sourceUri: r.sourceUri,
      score: r.score,
    })),
  };
}

