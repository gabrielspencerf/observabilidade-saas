import { desc, eq, sql } from "drizzle-orm";
import { conversationMessages, conversations, leads, opportunities } from "@/db/schema";
import { getDb } from "@/server/db";

type SummarySqlRow = {
  activeLeads: string;
  openOpportunities: string;
  classifications24h: string;
  messages24h: string;
  wonRevenue30d: string;
};

export interface VysenTenantDataToolOutput {
  summary: {
    activeLeads: number;
    openOpportunities: number;
    classifications24h: number;
    messages24h: number;
    wonRevenue30d: number;
  };
  leadsByStatus: Array<{ status: string; count: number }>;
  opportunitiesByStage: Array<{ stage: string; count: number }>;
  recentConversations: Array<{
    conversationId: string;
    status: string;
    startedAt: string;
    lastMessageAt: string | null;
  }>;
}

async function safeQuery<T>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await queryFn();
  } catch {
    return fallback;
  }
}

export async function runVysenTenantDataTool(tenantId: string): Promise<VysenTenantDataToolOutput> {
  const db = getDb();
  type SummaryExecuteResult = Awaited<ReturnType<typeof db.execute<SummarySqlRow>>>;
  const emptySummaryExecute = [] as unknown as SummaryExecuteResult;

  const [summaryRows, leadsStatusRows, oppStageRows, recentConversationRows] = await Promise.all([
    safeQuery(
      () =>
        db.execute<SummarySqlRow>(sql`
          SELECT
            (SELECT count(*) FROM leads l WHERE l.tenant_id = ${tenantId} AND l.status in ('new','contacted','qualified'))::text AS "activeLeads",
            (SELECT count(*) FROM opportunities o WHERE o.tenant_id = ${tenantId} AND o.stage = 'open')::text AS "openOpportunities",
            (SELECT count(*) FROM ai_classifications c WHERE c.tenant_id = ${tenantId} AND c.processed_at >= now() - interval '24 hours')::text AS "classifications24h",
            (SELECT count(*) FROM conversation_messages m INNER JOIN conversations cv ON cv.id = m.conversation_id WHERE cv.tenant_id = ${tenantId} AND m.sent_at >= now() - interval '24 hours')::text AS "messages24h",
            (SELECT coalesce(sum(coalesce(o.job_value::numeric,0)),0) FROM opportunities o WHERE o.tenant_id = ${tenantId} AND o.stage='won' AND o.updated_at >= now() - interval '30 days')::text AS "wonRevenue30d"
        `),
      emptySummaryExecute
    ),
    safeQuery(
      () =>
        db
          .select({ status: leads.status, count: sql<number>`count(*)` })
          .from(leads)
          .where(eq(leads.tenantId, tenantId))
          .groupBy(leads.status),
      []
    ),
    safeQuery(
      () =>
        db
          .select({ stage: opportunities.stage, count: sql<number>`count(*)` })
          .from(opportunities)
          .where(eq(opportunities.tenantId, tenantId))
          .groupBy(opportunities.stage),
      []
    ),
    safeQuery(
      () =>
        db
          .select({
            conversationId: conversations.id,
            status: conversations.status,
            startedAt: conversations.startedAt,
            lastMessageAt: sql<Date | null>`max(${conversationMessages.sentAt})`,
          })
          .from(conversations)
          .leftJoin(conversationMessages, eq(conversationMessages.conversationId, conversations.id))
          .where(eq(conversations.tenantId, tenantId))
          .groupBy(conversations.id, conversations.status, conversations.startedAt)
          .orderBy(desc(conversations.startedAt))
          .limit(6),
      []
    ),
  ]);

  const summary = (summaryRows as unknown as Array<{
    activeLeads: string;
    openOpportunities: string;
    classifications24h: string;
    messages24h: string;
    wonRevenue30d: string;
  }>)[0] ?? {
    activeLeads: "0",
    openOpportunities: "0",
    classifications24h: "0",
    messages24h: "0",
    wonRevenue30d: "0",
  };

  return {
    summary: {
      activeLeads: Number(summary.activeLeads ?? 0),
      openOpportunities: Number(summary.openOpportunities ?? 0),
      classifications24h: Number(summary.classifications24h ?? 0),
      messages24h: Number(summary.messages24h ?? 0),
      wonRevenue30d: Number(summary.wonRevenue30d ?? 0),
    },
    leadsByStatus: leadsStatusRows.map((row) => ({
      status: String(row.status),
      count: Number(row.count ?? 0),
    })),
    opportunitiesByStage: oppStageRows.map((row) => ({
      stage: row.stage ?? "unknown",
      count: Number(row.count ?? 0),
    })),
    recentConversations: recentConversationRows.map((row) => ({
      conversationId: row.conversationId,
      status: row.status,
      startedAt: row.startedAt.toISOString(),
      lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : null,
    })),
  };
}

