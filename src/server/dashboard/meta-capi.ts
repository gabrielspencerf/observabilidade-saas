/**
 * Preview de payloads CAPI a partir de leads qualificados/convertidos.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import { leads } from "@/db/schema";
import { buildCapiEventFromLead } from "@/server/integrations/meta-ads";

export interface MetaCapiPreviewRow {
  leadId: string;
  status: string;
  event: Record<string, unknown>;
  hasFbcOrUserData: boolean;
}

export interface MetaCapiPreviewResult {
  rows: MetaCapiPreviewRow[];
  totalQualified: number;
  totalConverted: number;
}

function rowHasSignal(event: Record<string, unknown>): boolean {
  const ud = event.user_data as Record<string, unknown> | undefined;
  if (!ud) return false;
  const hasFbc = typeof ud.fbc === "string" && ud.fbc.length > 0;
  const hasEm = Array.isArray(ud.em) && ud.em.length > 0;
  const hasPh = Array.isArray(ud.ph) && ud.ph.length > 0;
  return hasFbc || hasEm || hasPh;
}

function readMetadataNumber(
  metadata: Record<string, unknown> | null,
  fallback: number,
  ...keys: string[]
): number {
  if (!metadata) return fallback;
  for (const key of keys) {
    const v = metadata[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v.replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

export async function buildMetaCapiPreviewForTenant(
  tenantId: string,
  options: { limitPerStatus?: number; currencyCode?: string } = {}
): Promise<MetaCapiPreviewResult> {
  const limit = Math.min(100, Math.max(1, options.limitPerStatus ?? 25));
  const currency = options.currencyCode?.trim() || "BRL";

  const db = getDb();
  const [qualified, converted] = await Promise.all([
    db
      .select({
        id: leads.id,
        status: leads.status,
        email: leads.email,
        phone: leads.phone,
        lastSeenAt: leads.lastSeenAt,
        metadata: leads.metadata,
      })
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.status, "qualified")))
      .orderBy(desc(leads.lastSeenAt))
      .limit(limit),
    db
      .select({
        id: leads.id,
        status: leads.status,
        email: leads.email,
        phone: leads.phone,
        lastSeenAt: leads.lastSeenAt,
        metadata: leads.metadata,
      })
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), eq(leads.status, "converted")))
      .orderBy(desc(leads.lastSeenAt))
      .limit(limit),
  ]);

  const rows: MetaCapiPreviewRow[] = [];

  for (const lead of qualified) {
    const metadata = (lead.metadata ?? null) as Record<string, unknown> | null;
    const value = readMetadataNumber(metadata, 0, "conversionValue", "leadValue", "value");
    const event = buildCapiEventFromLead({
      id: lead.id,
      status: "qualified",
      email: lead.email,
      phone: lead.phone,
      lastSeenAt: lead.lastSeenAt,
      metadata,
      currency,
      value: value > 0 ? value : undefined,
    });
    rows.push({
      leadId: lead.id,
      status: "qualified",
      event,
      hasFbcOrUserData: rowHasSignal(event),
    });
  }

  for (const lead of converted) {
    const metadata = (lead.metadata ?? null) as Record<string, unknown> | null;
    const value = readMetadataNumber(metadata, 0, "conversionValue", "leadValue", "value");
    const event = buildCapiEventFromLead({
      id: lead.id,
      status: "converted",
      email: lead.email,
      phone: lead.phone,
      lastSeenAt: lead.lastSeenAt,
      metadata,
      currency,
      value: value > 0 ? value : undefined,
    });
    rows.push({
      leadId: lead.id,
      status: "converted",
      event,
      hasFbcOrUserData: rowHasSignal(event),
    });
  }

  return {
    rows,
    totalQualified: qualified.length,
    totalConverted: converted.length,
  };
}

export async function listLeadsForCapiSend(
  tenantId: string,
  leadIds: string[]
): Promise<
  Array<{
    id: string;
    status: string;
    email: string | null;
    phone: string | null;
    lastSeenAt: Date;
    metadata: Record<string, unknown> | null;
  }>
> {
  if (leadIds.length === 0) return [];
  const db = getDb();
  return db
    .select({
      id: leads.id,
      status: leads.status,
      email: leads.email,
      phone: leads.phone,
      lastSeenAt: leads.lastSeenAt,
      metadata: leads.metadata,
    })
    .from(leads)
    .where(
      and(
        eq(leads.tenantId, tenantId),
        inArray(leads.id, leadIds),
        inArray(leads.status, ["qualified", "converted"])
      )
    );
}
