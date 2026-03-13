/**
 * Listagem de leads por tenant. Uso em páginas do dashboard; tenant sempre da sessão.
 */

import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "@/server/db";
import { leads } from "@/db/schema";

export interface LeadRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  sourceProvider: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export interface ListLeadsOptions {
  search?: string;
  limit?: number;
}

/**
 * Lista leads do tenant ordenados por last_seen_at desc.
 * search: busca em name, email ou phone (ilike %search%).
 */
export async function listLeadsForTenant(
  tenantId: string,
  options: ListLeadsOptions = {}
): Promise<LeadRow[]> {
  const db = getDb();
  const { search, limit = 200 } = options;

  const term = search?.trim();
  const whereClause = term
    ? and(
        eq(leads.tenantId, tenantId),
        or(
          ilike(leads.name, `%${term}%`),
          ilike(leads.email, `%${term}%`),
          ilike(leads.phone, `%${term}%`)
        )
      )
    : eq(leads.tenantId, tenantId);

  const rows = await db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      status: leads.status,
      sourceProvider: leads.sourceProvider,
      firstSeenAt: leads.firstSeenAt,
      lastSeenAt: leads.lastSeenAt,
    })
    .from(leads)
    .where(whereClause)
    .orderBy(desc(leads.lastSeenAt))
    .limit(limit);

  return rows;
}
