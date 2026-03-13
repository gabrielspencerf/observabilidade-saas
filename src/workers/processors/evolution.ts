/**
 * Processador: raw event Evolution → conversations / conversation_messages.
 * Carrega raw event por id; atualiza processed_at (ou processing_error em falha).
 * Idempotente: upsert conversation por (tenant_id, evolution_instance_id, external_id);
 * mensagens dedup por (conversation_id, external_id).
 * Event types suportados nesta versão: messages.upsert (e alias MESSAGES_UPSERT).
 */

import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  evolutionWebhookEvents,
  conversations,
  conversationMessages,
} from "@/db/schema";
import type { JobProcessEvolutionRaw } from "../queue/types";

const CONVERSATION_STATUS_OPEN = "open";

/** Event types que geram conversa/mensagem na primeira versão. */
const SUPPORTED_MESSAGE_EVENTS = new Set([
  "messages.upsert",
  "MESSAGES_UPSERT",
]);

function stringOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Extrai dados da mensagem do payload Evolution (evento messages.upsert).
 * data.key: { remoteJid, fromMe, id }; data.message: { conversation?, extendedTextMessage? }; data.messageTimestamp.
 */
function parseMessagesUpsert(
  payload: Record<string, unknown>
): { remoteJid: string; fromMe: boolean; messageId: string; text: string | null; messageTimestamp: number } | null {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return null;

  const key = data.key as Record<string, unknown> | undefined;
  if (!key || typeof key !== "object") return null;

  const remoteJid = stringOrNull(key.remoteJid);
  const messageId = stringOrNull(key.id);
  if (!remoteJid || !messageId) return null;

  const fromMe = key.fromMe === true;

  const message = data.message as Record<string, unknown> | undefined;
  let text: string | null = null;
  if (message && typeof message === "object") {
    text =
      stringOrNull(message.conversation) ??
      (message.extendedTextMessage && typeof message.extendedTextMessage === "object"
        ? stringOrNull((message.extendedTextMessage as Record<string, unknown>).text)
        : null);
  }

  const ts = numberOrNull(data.messageTimestamp) ?? numberOrNull(payload.messageTimestamp);
  const messageTimestamp = ts ?? Math.floor(Date.now() / 1000);

  return { remoteJid, fromMe, messageId, text, messageTimestamp };
}

export async function processEvolutionRaw(
  job: JobProcessEvolutionRaw
): Promise<{ ok: true } | { error: string }> {
  const db = getDb();
  const { rawEventId, tenantId, evolutionInstanceId } = job;

  try {
    return await processEvolutionRawInner(db, job);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(evolutionWebhookEvents)
      .set({
        processingError: msg.slice(0, 1024),
        processedAt: new Date(),
      })
      .where(eq(evolutionWebhookEvents.id, rawEventId));
    return { error: msg };
  }
}

async function processEvolutionRawInner(
  db: ReturnType<typeof getDb>,
  job: JobProcessEvolutionRaw
): Promise<{ ok: true } | { error: string }> {
  const { rawEventId, tenantId, evolutionInstanceId } = job;

  const [raw] = await db
    .select()
    .from(evolutionWebhookEvents)
    .where(eq(evolutionWebhookEvents.id, rawEventId))
    .limit(1);

  if (!raw) {
    return { error: `Raw event not found: ${rawEventId}` };
  }
  if (raw.processedAt) {
    return { ok: true };
  }

  const eventType = raw.eventType;
  const payload = raw.payload as Record<string, unknown>;

  if (!SUPPORTED_MESSAGE_EVENTS.has(eventType)) {
    await db
      .update(evolutionWebhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(evolutionWebhookEvents.id, rawEventId));
    return { ok: true };
  }

  const parsed = parseMessagesUpsert(payload);
  if (!parsed) {
    await db
      .update(evolutionWebhookEvents)
      .set({
        processingError: "Invalid messages.upsert payload (missing key/remoteJid/id)",
        processedAt: new Date(),
      })
      .where(eq(evolutionWebhookEvents.id, rawEventId));
    return { error: "Invalid messages.upsert payload" };
  }

  const { remoteJid, fromMe, messageId, text, messageTimestamp } = parsed;
  const sentAt = new Date(messageTimestamp * 1000);
  const now = new Date();

  const [existingConv] = await db
    .select({ id: conversations.id, startedAt: conversations.startedAt })
    .from(conversations)
    .where(
      and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.evolutionInstanceId, evolutionInstanceId),
        eq(conversations.externalId, remoteJid)
      )
    )
    .limit(1);

  let conversationId: string;
  if (existingConv) {
    conversationId = existingConv.id;
    await db
      .update(conversations)
      .set({ lastSyncedAt: now, updatedAt: now })
      .where(eq(conversations.id, conversationId));
  } else {
    const [inserted] = await db
      .insert(conversations)
      .values({
        tenantId,
        evolutionInstanceId,
        externalId: remoteJid,
        status: CONVERSATION_STATUS_OPEN,
        startedAt: sentAt,
        lastSyncedAt: now,
      })
      .returning({ id: conversations.id });
    if (!inserted) {
      await db
        .update(evolutionWebhookEvents)
        .set({
          processingError: "Failed to create conversation",
          processedAt: new Date(),
        })
        .where(eq(evolutionWebhookEvents.id, rawEventId));
      return { error: "Failed to create conversation" };
    }
    conversationId = inserted.id;
  }

  const [existingMsg] = await db
    .select({ id: conversationMessages.id })
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.externalId, messageId)
      )
    )
    .limit(1);

  if (!existingMsg) {
    await db.insert(conversationMessages).values({
      tenantId,
      conversationId,
      externalId: messageId,
      direction: fromMe ? "out" : "in",
      contentType: "text",
      contentText: text,
      payload: payload,
      sentAt,
    });
  }

  await db
    .update(evolutionWebhookEvents)
    .set({ processedAt: new Date() })
    .where(eq(evolutionWebhookEvents.id, rawEventId));

  return { ok: true };
}
