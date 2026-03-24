import { sql } from "drizzle-orm";
import { getDb } from "@/server/db";

export interface AdminGlobalTypeMetric {
  name: string;
  total: number;
}

export interface AdminGlobalUserMetric {
  userEmail: string;
  totalInfos: number;
}

export interface AdminGlobalUserInsights {
  totals: {
    totalInfos: number;
    usersWithMembership: number;
    avgInfosPerUser: number;
  };
  byType: AdminGlobalTypeMetric[];
  byUserTop: AdminGlobalUserMetric[];
}

export async function getAdminGlobalUserInsights(): Promise<AdminGlobalUserInsights> {
  const db = getDb();

  const [totalsResult, byUserResult] = await Promise.all([
    db.execute<{
      total_infos: string;
      users_with_membership: string;
      avg_infos_per_user: string;
      total_leads: string;
      total_conversations: string;
      total_opportunities: string;
    }>(sql`
      WITH base AS (
        SELECT
          (SELECT count(*)::bigint FROM leads) AS total_leads,
          (SELECT count(*)::bigint FROM conversations) AS total_conversations,
          (SELECT count(*)::bigint FROM opportunities) AS total_opportunities
      ),
      infos_by_tenant AS (
        SELECT
          tenant_id,
          count(*)::bigint AS total_infos
        FROM (
          SELECT tenant_id FROM leads
          UNION ALL
          SELECT tenant_id FROM conversations
          UNION ALL
          SELECT tenant_id FROM opportunities
        ) all_infos
        GROUP BY tenant_id
      ),
      infos_by_user AS (
        SELECT
          m.user_id,
          coalesce(sum(t.total_infos), 0)::bigint AS total_infos
        FROM memberships m
        LEFT JOIN infos_by_tenant t ON t.tenant_id = m.tenant_id
        GROUP BY m.user_id
      )
      SELECT
        coalesce((SELECT sum(total_infos) FROM infos_by_user), 0)::text AS total_infos,
        coalesce((SELECT count(*) FROM infos_by_user), 0)::text AS users_with_membership,
        coalesce((SELECT avg(total_infos)::numeric FROM infos_by_user), 0)::text AS avg_infos_per_user,
        (SELECT total_leads::text FROM base) AS total_leads,
        (SELECT total_conversations::text FROM base) AS total_conversations,
        (SELECT total_opportunities::text FROM base) AS total_opportunities
    `),
    db.execute<{ user_email: string | null; total_infos: string }>(sql`
      WITH infos_by_tenant AS (
        SELECT
          tenant_id,
          count(*)::bigint AS total_infos
        FROM (
          SELECT tenant_id FROM leads
          UNION ALL
          SELECT tenant_id FROM conversations
          UNION ALL
          SELECT tenant_id FROM opportunities
        ) all_infos
        GROUP BY tenant_id
      ),
      infos_by_user AS (
        SELECT
          m.user_id,
          coalesce(sum(t.total_infos), 0)::bigint AS total_infos
        FROM memberships m
        LEFT JOIN infos_by_tenant t ON t.tenant_id = m.tenant_id
        GROUP BY m.user_id
      )
      SELECT
        u.email AS user_email,
        iu.total_infos::text AS total_infos
      FROM infos_by_user iu
      JOIN users u ON u.id = iu.user_id
      ORDER BY iu.total_infos DESC, u.email ASC
      LIMIT 8
    `),
  ]);

  const totalsRows = Array.isArray(totalsResult)
    ? totalsResult
    : (totalsResult as { rows?: typeof totalsResult }).rows ?? [];
  const totalsRow = totalsRows[0];

  const byUserRows = Array.isArray(byUserResult)
    ? byUserResult
    : (byUserResult as { rows?: typeof byUserResult }).rows ?? [];

  return {
    totals: {
      totalInfos: Number(totalsRow?.total_infos ?? 0),
      usersWithMembership: Number(totalsRow?.users_with_membership ?? 0),
      avgInfosPerUser: Number(totalsRow?.avg_infos_per_user ?? 0),
    },
    byType: [
      { name: "Leads", total: Number(totalsRow?.total_leads ?? 0) },
      { name: "Conversas", total: Number(totalsRow?.total_conversations ?? 0) },
      { name: "Oportunidades", total: Number(totalsRow?.total_opportunities ?? 0) },
    ],
    byUserTop: byUserRows.map((row) => ({
      userEmail: row.user_email ?? "Sem email",
      totalInfos: Number(row.total_infos ?? 0),
    })),
  };
}
