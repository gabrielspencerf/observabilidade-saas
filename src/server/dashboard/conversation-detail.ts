/**
 * Detalhe de conversa por tenant. Retorna null se a conversa não existir ou não pertencer ao tenant.
 * Suporta Evolution, UAZAPI, Chatwoot e WhatsApp Cloud.
 */

import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  conversations,
  conversationMessages,
  evolutionInstances,
  uazapiInstances,
  chatwootAccounts,
  whatsappCloudNumbers,
  leads,
  aiClassifications,
} from "@/db/schema";
import { extractAiInsightFromEvidences, type ConversationAiInsight } from "@/server/ai/commercial-agent";

export interface ConversationDetailMessage {
  id: string;
  direction: string;
  contentType: string;
  contentText: string | null;
  payload: Record<string, unknown> | null;
  sentAt: Date;
  /** True quando a mensagem foi enviada por agente/IA/BOT. */
  sentByBot: boolean;
}

export interface ConversationDetail {
  id: string;
  externalId: string;
  status: string;
  startedAt: Date;
  lastSyncedAt: Date | null;
  instanceDisplay: string;
  leadId: string | null;
  leadName: string | null;
  leadEmail: string | null;
  leadPhone: string | null;
  aiInsight: ConversationAiInsight | null;
  messages: ConversationDetailMessage[];
}

/**
 * Carrega conversa pelo id garantindo tenant_id. Retorna null se não existir ou não for do tenant.
 */
export async function getConversationDetailForTenant(
  tenantId: string,
  conversationId: string
): Promise<ConversationDetail | null> {
  const db = getDb();

  const [row] = await db
    .select({
      id: conversations.id,
      externalId: conversations.externalId,
      status: conversations.status,
      startedAt: conversations.startedAt,
      lastSyncedAt: conversations.lastSyncedAt,
      leadId: conversations.leadId,
      evolutionInstanceName: evolutionInstances.instanceName,
      evolutionInstanceExternalId: evolutionInstances.externalId,
      uazapiInstanceName: uazapiInstances.instanceName,
      uazapiInstanceExternalId: uazapiInstances.externalId,
      chatwootAccountLabel: chatwootAccounts.label,
      chatwootAccountExternalId: chatwootAccounts.externalId,
      wcNumberLabel: whatsappCloudNumbers.label,
      wcDisplayPhone: whatsappCloudNumbers.displayPhone,
      wcPhoneNumberId: whatsappCloudNumbers.phoneNumberId,
      leadName: leads.name,
      leadEmail: leads.email,
      leadPhone: leads.phone,
    })
    .from(conversations)
    .leftJoin(
      evolutionInstances,
      eq(conversations.evolutionInstanceId, evolutionInstances.id)
    )
    .leftJoin(
      uazapiInstances,
      eq(conversations.uazapiInstanceId, uazapiInstances.id)
    )
    .leftJoin(
      chatwootAccounts,
      eq(conversations.chatwootAccountId, chatwootAccounts.id)
    )
    .leftJoin(
      whatsappCloudNumbers,
      eq(conversations.whatsappCloudNumberId, whatsappCloudNumbers.id)
    )
    .leftJoin(leads, eq(conversations.leadId, leads.id))
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.id, conversationId)
      )
    )
    .limit(1);

  if (!row) return null;

  const messages = await db
    .select({
      id: conversationMessages.id,
      direction: conversationMessages.direction,
      contentType: conversationMessages.contentType,
      contentText: conversationMessages.contentText,
      payload: conversationMessages.payload,
      sentAt: conversationMessages.sentAt,
      sentByBot: conversationMessages.sentByBot,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(asc(conversationMessages.sentAt));

  const [classification] = await db
    .select({
      summary: aiClassifications.summary,
      classificationType: aiClassifications.classificationType,
      confidenceScore: aiClassifications.confidenceScore,
      evidences: aiClassifications.evidences,
    })
    .from(aiClassifications)
    .where(
      and(
        eq(aiClassifications.tenantId, tenantId),
        eq(aiClassifications.conversationId, conversationId),
        eq(aiClassifications.isCurrent, true)
      )
    )
    .limit(1);

  const evolutionDisplay =
    (row.evolutionInstanceName && row.evolutionInstanceName.trim()) ||
    row.evolutionInstanceExternalId ||
    "";
  const uazapiDisplay =
    (row.uazapiInstanceName && row.uazapiInstanceName.trim()) ||
    row.uazapiInstanceExternalId ||
    "";
  const chatwootTail =
    (row.chatwootAccountLabel && row.chatwootAccountLabel.trim()) ||
    row.chatwootAccountExternalId ||
    "";
  const chatwootDisplay = chatwootTail ? `Chatwoot · ${chatwootTail}` : "";
  const wcTail =
    (row.wcNumberLabel && row.wcNumberLabel.trim()) ||
    row.wcDisplayPhone ||
    row.wcPhoneNumberId ||
    "";
  const wcDisplay = wcTail ? `WhatsApp · ${wcTail}` : "";
  const instanceDisplay =
    evolutionDisplay || uazapiDisplay || chatwootDisplay || wcDisplay || row.id;

  return {
    id: row.id,
    externalId: row.externalId,
    status: row.status,
    startedAt: row.startedAt,
    lastSyncedAt: row.lastSyncedAt,
    instanceDisplay,
    leadId: row.leadId,
    leadName: row.leadName,
    leadEmail: row.leadEmail,
    leadPhone: row.leadPhone,
    aiInsight: classification
      ? extractAiInsightFromEvidences({
          summary: classification.summary,
          classificationType: classification.classificationType,
          confidenceScore: classification.confidenceScore,
          evidences: (classification.evidences as Record<string, unknown> | null) ?? null,
        })
      : null,
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      contentType: m.contentType,
      contentText: m.contentText,
      payload: (m.payload as Record<string, unknown> | null) ?? null,
      sentAt: m.sentAt,
      sentByBot: m.sentByBot ?? false,
    })),
  };
}
