/**
 * Resumo do hub operacional (dashboard home) por tenant.
 * Totais e listas recentes para exibição na home.
 */

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import { leads, conversations, googleAdsAccounts } from "@/db/schema";
import { listLeadsForTenant } from "./leads";
import { listConversationsForTenant } from "./conversations";
import type { LeadRow } from "./leads";
import type { ConversationRow } from "./conversations";

export interface HomeSummary {
  totalLeads: number;
  totalConversations: number;
  totalGoogleAdsAccounts: number;
  recentLeads: LeadRow[];
  recentConversations: ConversationRow[];
}

const RECENT_LIMIT = 10;

/**
 * Retorna totais (leads, conversas) e listas recentes para o tenant.
 * Queries em paralelo; sempre filtrado por tenant_id.
 */
export async function getHomeSummaryForTenant(
  tenantId: string
): Promise<HomeSummary> {
  const db = getDb();

  const [
    totalLeadsResult,
    totalConvsResult,
    totalGoogleAdsResult,
    recentLeads,
    recentConversations,
  ] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(leads)
      .where(eq(leads.tenantId, tenantId)),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(conversations)
      .where(eq(conversations.tenantId, tenantId)),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(googleAdsAccounts)
      .where(eq(googleAdsAccounts.tenantId, tenantId)),
    listLeadsForTenant(tenantId, { limit: RECENT_LIMIT }),
    listConversationsForTenant(tenantId, { limit: RECENT_LIMIT }),
  ]);

  const totalLeads = totalLeadsResult[0]?.value ?? 0;
  const totalConversations = totalConvsResult[0]?.value ?? 0;
  const totalGoogleAdsAccounts = totalGoogleAdsResult[0]?.value ?? 0;

  return {
    totalLeads,
    totalConversations,
    totalGoogleAdsAccounts,
    recentLeads,
    recentConversations,
  };
}
