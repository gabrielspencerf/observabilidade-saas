/**
 * Listagem de conversas por tenant. Uso em páginas do dashboard; tenant sempre da sessão.
 */

import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  conversations,
  conversationMessages,
  evolutionInstances,
} from "@/db/schema";

export interface ConversationRow {
  id: string;
  externalId: string;
  status: string;
  startedAt: Date;
  lastSyncedAt: Date | null;
  instanceDisplay: string;
  messageCount: number;
}

export interface ListConversationsOptions {
  limit?: number;
}

/**
 * Lista conversas do tenant com nome da instância e contagem de mensagens.
 * Ordenado por last_synced_at desc (nulls last), depois started_at desc.
 */
export async function listConversationsForTenant(
  tenantId: string,
  options: ListConversationsOptions = {}
): Promise<ConversationRow[]> {
  const db = getDb();
  const { limit = 200 } = options;

  const rows = await db
    .select({
      id: conversations.id,
      externalId: conversations.externalId,
      status: conversations.status,
      startedAt: conversations.startedAt,
      lastSyncedAt: conversations.lastSyncedAt,
      instanceName: evolutionInstances.instanceName,
      instanceExternalId: evolutionInstances.externalId,
    })
    .from(conversations)
    .innerJoin(
      evolutionInstances,
      eq(conversations.evolutionInstanceId, evolutionInstances.id)
    )
    .where(eq(conversations.tenantId, tenantId))
    .orderBy(
      desc(conversations.lastSyncedAt),
      desc(conversations.startedAt)
    )
    .limit(limit);

  const conversationIds = rows.map((r) => r.id);
  const counts: Record<string, number> = {};
  if (conversationIds.length > 0) {
    const countRows = await db
      .select({
        conversationId: conversationMessages.conversationId,
        count: sql<number>`count(*)::int`,
      })
      .from(conversationMessages)
      .where(eq(conversationMessages.tenantId, tenantId))
      .groupBy(conversationMessages.conversationId);
    for (const r of countRows) {
      counts[r.conversationId] = r.count;
    }
  }

  return rows.map((r) => ({
    id: r.id,
    externalId: r.externalId,
    status: r.status,
    startedAt: r.startedAt,
    lastSyncedAt: r.lastSyncedAt,
    instanceDisplay:
      (r.instanceName && r.instanceName.trim()) || r.instanceExternalId || r.id,
    messageCount: counts[r.id] ?? 0,
  }));
}
