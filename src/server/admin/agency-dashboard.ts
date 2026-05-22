import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";

export interface AgencyPortfolioSummary {
  totalTenants: number;
  activeTenants: number;
  tenantsWithData: number;
  totalMemberships: number;
  totalLeads: number;
  totalConversations: number;
  totalOpportunities: number;
}

export interface AgencyPortfolioTenantRow {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  isActive: boolean;
  memberships: number;
  leads: number;
  conversations: number;
  opportunities: number;
  integrationsConfigured: number;
  openOpportunities: number;
  lastLeadAt: string | null;
  lastConversationAt: string | null;
  lastTouchAt: string | null;
  health: "healthy" | "attention" | "idle";
}

export interface AgencyPortfolioData {
  summary: AgencyPortfolioSummary;
  tenants: AgencyPortfolioTenantRow[];
}

function toNumber(value: string | number | null | undefined): number {
  return Number(value ?? 0);
}

function computeHealth(input: {
  isActive: boolean;
  integrationsConfigured: number;
  lastTouchAt: string | null;
}): "healthy" | "attention" | "idle" {
  if (!input.isActive) return "idle";
  if (!input.lastTouchAt) return input.integrationsConfigured > 0 ? "attention" : "idle";

  const ageMs = Date.now() - new Date(input.lastTouchAt).getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);

  if (ageDays <= 14 && input.integrationsConfigured > 0) return "healthy";
  if (ageDays <= 45 || input.integrationsConfigured > 0) return "attention";
  return "idle";
}

export async function getAgencyPortfolioData(): Promise<AgencyPortfolioData> {
  const db = getDb();

  const [summaryResult, tenantsResult] = await Promise.all([
    db.execute<{
      total_tenants: string;
      active_tenants: string;
      tenants_with_data: string;
      total_memberships: string;
      total_leads: string;
      total_conversations: string;
      total_opportunities: string;
    }>(sql`
      WITH tenant_base AS (
        SELECT
          t.id,
          t.is_active,
          coalesce(l.total_leads, 0) AS total_leads,
          coalesce(c.total_conversations, 0) AS total_conversations,
          coalesce(o.total_opportunities, 0) AS total_opportunities
        FROM tenants t
        LEFT JOIN (
          SELECT tenant_id, count(*)::bigint AS total_leads
          FROM leads
          GROUP BY tenant_id
        ) l ON l.tenant_id = t.id
        LEFT JOIN (
          SELECT tenant_id, count(*)::bigint AS total_conversations
          FROM conversations
          GROUP BY tenant_id
        ) c ON c.tenant_id = t.id
        LEFT JOIN (
          SELECT tenant_id, count(*)::bigint AS total_opportunities
          FROM opportunities
          GROUP BY tenant_id
        ) o ON o.tenant_id = t.id
      )
      SELECT
        count(*)::text AS total_tenants,
        count(*) FILTER (WHERE is_active = true)::text AS active_tenants,
        count(*) FILTER (
          WHERE total_leads > 0 OR total_conversations > 0 OR total_opportunities > 0
        )::text AS tenants_with_data,
        (SELECT count(*)::text FROM memberships) AS total_memberships,
        coalesce(sum(total_leads), 0)::text AS total_leads,
        coalesce(sum(total_conversations), 0)::text AS total_conversations,
        coalesce(sum(total_opportunities), 0)::text AS total_opportunities
      FROM tenant_base
    `),
    db.execute<{
      tenant_id: string;
      tenant_name: string;
      tenant_slug: string;
      is_active: boolean;
      memberships: string;
      leads: string;
      conversations: string;
      opportunities: string;
      integrations_configured: string;
      open_opportunities: string;
      last_lead_at: string | null;
      last_conversation_at: string | null;
      last_touch_at: string | null;
    }>(sql`
      WITH membership_counts AS (
        SELECT tenant_id, count(*)::bigint AS memberships
        FROM memberships
        GROUP BY tenant_id
      ),
      lead_stats AS (
        SELECT
          tenant_id,
          count(*)::bigint AS leads,
          max(coalesce(last_seen_at, first_seen_at, created_at)) AS last_lead_at
        FROM leads
        GROUP BY tenant_id
      ),
      conversation_stats AS (
        SELECT
          tenant_id,
          count(*)::bigint AS conversations,
          max(coalesce(last_synced_at, updated_at, started_at)) AS last_conversation_at
        FROM conversations
        GROUP BY tenant_id
      ),
      opportunity_stats AS (
        SELECT
          tenant_id,
          count(*)::bigint AS opportunities,
          count(*) FILTER (WHERE stage IN ('open', 'qualified'))::bigint AS open_opportunities
        FROM opportunities
        GROUP BY tenant_id
      ),
      integration_counts AS (
        SELECT tenant_id, count(*)::bigint AS integrations_configured
        FROM (
          SELECT tenant_id FROM evolution_instances
          UNION ALL
          SELECT tenant_id FROM uazapi_instances
          UNION ALL
          SELECT tenant_id FROM chatwoot_accounts
          UNION ALL
          SELECT tenant_id FROM whatsapp_cloud_numbers
          UNION ALL
          SELECT tenant_id FROM google_ads_accounts
          UNION ALL
          SELECT tenant_id FROM meta_ads_accounts
          UNION ALL
          SELECT tenant_id FROM clarity_connections
          UNION ALL
          SELECT tenant_id FROM typebot_bots
        ) integrations
        GROUP BY tenant_id
      )
      SELECT
        t.id AS tenant_id,
        t.name AS tenant_name,
        t.slug AS tenant_slug,
        t.is_active,
        coalesce(m.memberships, 0)::text AS memberships,
        coalesce(l.leads, 0)::text AS leads,
        coalesce(c.conversations, 0)::text AS conversations,
        coalesce(o.opportunities, 0)::text AS opportunities,
        coalesce(i.integrations_configured, 0)::text AS integrations_configured,
        coalesce(o.open_opportunities, 0)::text AS open_opportunities,
        l.last_lead_at::text AS last_lead_at,
        c.last_conversation_at::text AS last_conversation_at,
        greatest(
          coalesce(l.last_lead_at, to_timestamp(0)),
          coalesce(c.last_conversation_at, to_timestamp(0))
        )::text AS last_touch_at
      FROM tenants t
      LEFT JOIN membership_counts m ON m.tenant_id = t.id
      LEFT JOIN lead_stats l ON l.tenant_id = t.id
      LEFT JOIN conversation_stats c ON c.tenant_id = t.id
      LEFT JOIN opportunity_stats o ON o.tenant_id = t.id
      LEFT JOIN integration_counts i ON i.tenant_id = t.id
      ORDER BY
        greatest(
          coalesce(l.last_lead_at, to_timestamp(0)),
          coalesce(c.last_conversation_at, to_timestamp(0))
        ) DESC,
        t.name ASC
    `),
  ]);

  const summaryRows = Array.isArray(summaryResult)
    ? summaryResult
    : (summaryResult as { rows?: typeof summaryResult }).rows ?? [];
  const tenantsRows = Array.isArray(tenantsResult)
    ? tenantsResult
    : (tenantsResult as { rows?: typeof tenantsResult }).rows ?? [];

  const summaryRow = summaryRows[0];

  return {
    summary: {
      totalTenants: toNumber(summaryRow?.total_tenants),
      activeTenants: toNumber(summaryRow?.active_tenants),
      tenantsWithData: toNumber(summaryRow?.tenants_with_data),
      totalMemberships: toNumber(summaryRow?.total_memberships),
      totalLeads: toNumber(summaryRow?.total_leads),
      totalConversations: toNumber(summaryRow?.total_conversations),
      totalOpportunities: toNumber(summaryRow?.total_opportunities),
    },
    tenants: tenantsRows.map((row) => {
      const lastTouchAt =
        row.last_touch_at && row.last_touch_at !== "1970-01-01 00:00:00+00"
          ? row.last_touch_at
          : null;
      const integrationsConfigured = toNumber(row.integrations_configured);

      return {
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        tenantSlug: row.tenant_slug,
        isActive: row.is_active,
        memberships: toNumber(row.memberships),
        leads: toNumber(row.leads),
        conversations: toNumber(row.conversations),
        opportunities: toNumber(row.opportunities),
        integrationsConfigured,
        openOpportunities: toNumber(row.open_opportunities),
        lastLeadAt: row.last_lead_at ?? null,
        lastConversationAt: row.last_conversation_at ?? null,
        lastTouchAt,
        health: computeHealth({
          isActive: row.is_active,
          integrationsConfigured,
          lastTouchAt,
        }),
      };
    }),
  };
}
