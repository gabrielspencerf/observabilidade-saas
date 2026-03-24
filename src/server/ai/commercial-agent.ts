import { and, desc, eq, sql } from "drizzle-orm";
import { aiClassifications, conversationMessages, conversations } from "@/db/schema";
import { getDb } from "@/server/db";
import { getResolvedOpenAIAgentConfig } from "@/server/config/openai-agent";
import { writeAuditLog } from "@/server/audit/log";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

type ClassificationType =
  | "sale"
  | "loss"
  | "abandonment"
  | "no_response"
  | "bad_lead"
  | "duplicate"
  | "rescheduled"
  | "other";

type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "converted"
  | "lost"
  | "duplicate"
  | "bad_lead";

type OpportunityStage = "open" | "qualified" | "won" | "lost";

interface ParsedAgentOutput {
  summary: string;
  classificationType: ClassificationType;
  confidenceScore: number;
  suggestedLeadStatus: LeadStatus | null;
  suggestedOpportunityStage: OpportunityStage | null;
  commercialErrors: string[];
  keyEvidence: string[];
  closingIntent: "high" | "medium" | "low";
  negotiationStage: "open" | "qualified" | "won" | "lost";
  bottlenecks: string[];
  wins: string[];
  nextBestActions: string[];
}

export interface ConversationAiInsight {
  summary: string | null;
  classificationType: ClassificationType;
  confidenceScore: number | null;
  suggestedLeadStatus: LeadStatus | null;
  suggestedOpportunityStage: OpportunityStage | null;
  commercialErrors: string[];
  closingIntent: "high" | "medium" | "low";
  negotiationStage: "open" | "qualified" | "won" | "lost";
  bottlenecks: string[];
  wins: string[];
  nextBestActions: string[];
}

function normalizeClassificationType(value: unknown): ClassificationType {
  const accepted: ClassificationType[] = [
    "sale",
    "loss",
    "abandonment",
    "no_response",
    "bad_lead",
    "duplicate",
    "rescheduled",
    "other",
  ];
  if (typeof value === "string" && accepted.includes(value as ClassificationType)) {
    return value as ClassificationType;
  }
  return "other";
}

function normalizeLeadStatus(value: unknown): LeadStatus | null {
  const accepted: LeadStatus[] = [
    "new",
    "contacted",
    "qualified",
    "converted",
    "lost",
    "duplicate",
    "bad_lead",
  ];
  if (typeof value === "string" && accepted.includes(value as LeadStatus)) {
    return value as LeadStatus;
  }
  return null;
}

function normalizeOpportunityStage(value: unknown): OpportunityStage | null {
  const accepted: OpportunityStage[] = ["open", "qualified", "won", "lost"];
  if (typeof value === "string" && accepted.includes(value as OpportunityStage)) {
    return value as OpportunityStage;
  }
  return null;
}

function normalizeConfidence(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.35;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return Math.round(n * 100) / 100;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string" && item.trim())
    .map((item) => item.trim())
    .slice(0, 12);
}

function normalizeClosingIntent(value: unknown): "high" | "medium" | "low" {
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  return "medium";
}

function normalizeNegotiationStage(value: unknown): "open" | "qualified" | "won" | "lost" {
  if (value === "open" || value === "qualified" || value === "won" || value === "lost") {
    return value;
  }
  return "open";
}

function mapFallbackSuggestions(classificationType: ClassificationType): {
  suggestedLeadStatus: LeadStatus | null;
  suggestedOpportunityStage: OpportunityStage | null;
} {
  switch (classificationType) {
    case "sale":
      return { suggestedLeadStatus: "converted", suggestedOpportunityStage: "won" };
    case "loss":
      return { suggestedLeadStatus: "lost", suggestedOpportunityStage: "lost" };
    case "duplicate":
      return { suggestedLeadStatus: "duplicate", suggestedOpportunityStage: null };
    case "bad_lead":
      return { suggestedLeadStatus: "bad_lead", suggestedOpportunityStage: null };
    case "abandonment":
    case "no_response":
      return { suggestedLeadStatus: "contacted", suggestedOpportunityStage: "open" };
    case "rescheduled":
      return { suggestedLeadStatus: "qualified", suggestedOpportunityStage: "qualified" };
    default:
      return { suggestedLeadStatus: null, suggestedOpportunityStage: null };
  }
}

function parseAgentOutput(raw: string): ParsedAgentOutput {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  const classificationType = normalizeClassificationType(parsed.classificationType);
  const fallback = mapFallbackSuggestions(classificationType);

  const summary =
    typeof parsed.summary === "string" && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 2000)
      : "Sem resumo estruturado para esta conversa.";

  return {
    summary,
    classificationType,
    confidenceScore: normalizeConfidence(parsed.confidenceScore),
    suggestedLeadStatus:
      normalizeLeadStatus(parsed.suggestedLeadStatus) ?? fallback.suggestedLeadStatus,
    suggestedOpportunityStage:
      normalizeOpportunityStage(parsed.suggestedOpportunityStage) ??
      fallback.suggestedOpportunityStage,
    commercialErrors: safeStringArray(parsed.commercialErrors),
    keyEvidence: safeStringArray(parsed.keyEvidence),
    closingIntent: normalizeClosingIntent(parsed.closingIntent),
    negotiationStage: normalizeNegotiationStage(parsed.negotiationStage),
    bottlenecks: safeStringArray(parsed.bottlenecks),
    wins: safeStringArray(parsed.wins),
    nextBestActions: safeStringArray(parsed.nextBestActions),
  };
}

async function buildConversationTranscript(conversationId: string): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({
      direction: conversationMessages.direction,
      sentByBot: conversationMessages.sentByBot,
      contentType: conversationMessages.contentType,
      contentText: conversationMessages.contentText,
      sentAt: conversationMessages.sentAt,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(desc(conversationMessages.sentAt))
    .limit(80);

  const ordered = [...rows].reverse();
  if (ordered.length === 0) return "Conversa sem mensagens.";

  return ordered
    .map((row) => {
      const role = row.direction === "out" ? (row.sentByBot ? "AGENTE" : "VENDEDOR") : "LEAD";
      const message =
        row.contentText?.trim() ||
        (row.contentType === "audio"
          ? "[áudio sem transcrição]"
          : row.contentType === "image"
            ? "[imagem sem descrição]"
            : `[${row.contentType}]`);
      return `[${row.sentAt.toISOString()}] ${role}: ${message}`;
    })
    .join("\n");
}

async function callOpenAiCommercialAnalysis(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  transcript: string;
}): Promise<ParsedAgentOutput | null> {
  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.systemPrompt },
        {
          role: "user",
          content: [
            "Analise a conversa e retorne JSON com o formato:",
            "{",
            '  "summary": "string",',
            '  "classificationType": "sale|loss|abandonment|no_response|bad_lead|duplicate|rescheduled|other",',
            '  "confidenceScore": 0.0,',
            '  "suggestedLeadStatus": "new|contacted|qualified|converted|lost|duplicate|bad_lead|null",',
            '  "suggestedOpportunityStage": "open|qualified|won|lost|null",',
            '  "commercialErrors": ["string"],',
            '  "keyEvidence": ["string"],',
            '  "closingIntent": "high|medium|low",',
            '  "negotiationStage": "open|qualified|won|lost",',
            '  "bottlenecks": ["string"],',
            '  "wins": ["string"],',
            '  "nextBestActions": ["string"]',
            "}",
            "",
            "Conversa:",
            input.transcript,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) return null;
  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) return null;
  return parseAgentOutput(content);
}

export async function classifyConversationAndPersist(input: {
  tenantId: string;
  conversationId: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db = getDb();
  const [conversation] = await db
    .select({
      id: conversations.id,
      tenantId: conversations.tenantId,
      leadId: conversations.leadId,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.id, input.conversationId),
        eq(conversations.tenantId, input.tenantId)
      )
    )
    .limit(1);

  if (!conversation) {
    return { ok: false, reason: "conversation_not_found" };
  }

  const agentConfig = await getResolvedOpenAIAgentConfig(input.tenantId);
  if (!agentConfig.enabled) {
    return { ok: false, reason: "agent_disabled" };
  }
  if (!agentConfig.apiKey || agentConfig.apiKey.length < 10) {
    return { ok: false, reason: "missing_api_key" };
  }

  // Idempotência: se já classificamos após a última mensagem,
  // evitamos montar transcript e chamar OpenAI.
  const [maxMessageRow, currentClassificationRow] = await Promise.all([
    db
      .select({
        lastMessageSentAt: sql<Date>`max(${conversationMessages.sentAt})`,
      })
      .from(conversationMessages)
      .where(eq(conversationMessages.conversationId, conversation.id))
      .limit(1),
    db
      .select({
        processedAt: aiClassifications.processedAt,
      })
      .from(aiClassifications)
      .where(
        and(
          eq(aiClassifications.conversationId, conversation.id),
          eq(aiClassifications.isCurrent, true)
        )
      )
      .orderBy(desc(aiClassifications.processedAt))
      .limit(1),
  ]);

  const lastMessageSentAt = maxMessageRow?.[0]?.lastMessageSentAt ?? null;
  const currentProcessedAt =
    currentClassificationRow?.[0]?.processedAt ?? null;

  if (
    currentProcessedAt &&
    lastMessageSentAt &&
    currentProcessedAt.getTime() >= lastMessageSentAt.getTime()
  ) {
    return { ok: true };
  }

  const transcript = await buildConversationTranscript(conversation.id);
  const parsed = await callOpenAiCommercialAnalysis({
    apiKey: agentConfig.apiKey,
    model: agentConfig.model,
    systemPrompt: agentConfig.systemPrompt,
    transcript,
  });
  if (!parsed) {
    return { ok: false, reason: "openai_failed" };
  }

  const [versionRow] = await db
    .select({
      nextVersion: sql<number>`coalesce(max(${aiClassifications.version}), 0) + 1`,
    })
    .from(aiClassifications)
    .where(eq(aiClassifications.conversationId, conversation.id));
  const nextVersion = versionRow?.nextVersion ?? 1;

  await db.transaction(async (tx) => {
    await tx
      .update(aiClassifications)
      .set({
        isCurrent: false,
        supersededAt: new Date(),
      })
      .where(
        and(
          eq(aiClassifications.conversationId, conversation.id),
          eq(aiClassifications.isCurrent, true)
        )
      );

    await tx.insert(aiClassifications).values({
      tenantId: input.tenantId,
      conversationId: conversation.id,
      leadId: conversation.leadId,
      classificationType: parsed.classificationType,
      confidenceScore: parsed.confidenceScore.toFixed(2),
      summary: parsed.summary,
      evidences: {
        keyEvidence: parsed.keyEvidence,
        commercialErrors: parsed.commercialErrors,
        suggestedLeadStatus: parsed.suggestedLeadStatus,
        suggestedOpportunityStage: parsed.suggestedOpportunityStage,
        closingIntent: parsed.closingIntent,
        negotiationStage: parsed.negotiationStage,
        bottlenecks: parsed.bottlenecks,
        wins: parsed.wins,
        nextBestActions: parsed.nextBestActions,
      },
      modelVersion: agentConfig.model,
      version: nextVersion,
      isCurrent: true,
      supersededAt: null,
      processedAt: new Date(),
    });
  });

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: null,
    action: "create",
    resourceType: "ai_classification",
    resourceId: conversation.id,
    newValues: {
      classificationType: parsed.classificationType,
      confidenceScore: parsed.confidenceScore,
      suggestedLeadStatus: parsed.suggestedLeadStatus,
      suggestedOpportunityStage: parsed.suggestedOpportunityStage,
    },
  });

  return { ok: true };
}

export function extractAiInsightFromEvidences(input: {
  summary: string | null;
  classificationType: string;
  confidenceScore: string | null;
  evidences: Record<string, unknown> | null;
}): ConversationAiInsight {
  const evidences = input.evidences ?? {};
  return {
    summary: input.summary,
    classificationType: normalizeClassificationType(input.classificationType),
    confidenceScore:
      input.confidenceScore && Number.isFinite(Number(input.confidenceScore))
        ? Number(input.confidenceScore)
        : null,
    suggestedLeadStatus: normalizeLeadStatus(evidences.suggestedLeadStatus),
    suggestedOpportunityStage: normalizeOpportunityStage(
      evidences.suggestedOpportunityStage
    ),
    commercialErrors: safeStringArray(evidences.commercialErrors),
    closingIntent: normalizeClosingIntent(evidences.closingIntent),
    negotiationStage: normalizeNegotiationStage(evidences.negotiationStage),
    bottlenecks: safeStringArray(evidences.bottlenecks),
    wins: safeStringArray(evidences.wins),
    nextBestActions: safeStringArray(evidences.nextBestActions),
  };
}
