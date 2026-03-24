/**
 * Estatísticas e listagens de integrações para Admin > Integrações.
 */
import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  typebotBots,
  evolutionInstances,
  uazapiInstances,
  googleAdsAccounts,
  tenants,
} from "@/db/schema";

export type IntegrationStats = {
  typebotBots: number;
  evolutionInstances: number;
  uazapiInstances: number;
  googleAdsAccounts: number;
};

export async function getIntegrationStats(tenantId?: string): Promise<IntegrationStats> {
  const db = getDb();
  const [typebotRows, evolutionRows, googleAdsRows, uazapiRows] = await Promise.all([
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(typebotBots)
      .where(tenantId ? eq(typebotBots.tenantId, tenantId) : undefined),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(evolutionInstances)
      .where(tenantId ? eq(evolutionInstances.tenantId, tenantId) : undefined),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(googleAdsAccounts)
      .where(tenantId ? eq(googleAdsAccounts.tenantId, tenantId) : undefined),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(uazapiInstances)
      .where(tenantId ? eq(uazapiInstances.tenantId, tenantId) : undefined),
  ]);
  const typebot = typebotRows[0]?.value ?? 0;
  const evolution = evolutionRows[0]?.value ?? 0;
  const googleAds = googleAdsRows[0]?.value ?? 0;
  const uazapi = uazapiRows[0]?.value ?? 0;

  return {
    typebotBots: typebot,
    evolutionInstances: evolution,
    uazapiInstances: uazapi,
    googleAdsAccounts: googleAds,
  };
}

export type TypebotBotRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  externalId: string;
  name: string | null;
};

export async function listTypebotBots(tenantId?: string): Promise<TypebotBotRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: typebotBots.id,
      tenantId: typebotBots.tenantId,
      externalId: typebotBots.externalId,
      name: typebotBots.name,
      tenantName: tenants.name,
    })
    .from(typebotBots)
    .innerJoin(tenants, eq(typebotBots.tenantId, tenants.id))
    .where(tenantId ? eq(typebotBots.tenantId, tenantId) : undefined)
    .orderBy(desc(typebotBots.createdAt));
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    externalId: r.externalId,
    name: r.name,
  }));
}

export type EvolutionInstanceRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  externalId: string;
  baseUrl: string;
  instanceName: string | null;
};

export async function listEvolutionInstances(tenantId?: string): Promise<EvolutionInstanceRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: evolutionInstances.id,
      tenantId: evolutionInstances.tenantId,
      externalId: evolutionInstances.externalId,
      baseUrl: evolutionInstances.baseUrl,
      instanceName: evolutionInstances.instanceName,
      tenantName: tenants.name,
    })
    .from(evolutionInstances)
    .innerJoin(tenants, eq(evolutionInstances.tenantId, tenants.id))
    .where(tenantId ? eq(evolutionInstances.tenantId, tenantId) : undefined)
    .orderBy(desc(evolutionInstances.createdAt));
  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    externalId: r.externalId,
    baseUrl: r.baseUrl,
    instanceName: r.instanceName,
  }));
}

export type UazapiInstanceRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  externalId: string;
  baseUrl: string;
  instanceName: string | null;
};

export async function listUazapiInstances(tenantId?: string): Promise<UazapiInstanceRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: uazapiInstances.id,
      tenantId: uazapiInstances.tenantId,
      externalId: uazapiInstances.externalId,
      baseUrl: uazapiInstances.baseUrl,
      instanceName: uazapiInstances.instanceName,
      tenantName: tenants.name,
    })
    .from(uazapiInstances)
    .innerJoin(tenants, eq(uazapiInstances.tenantId, tenants.id))
    .where(tenantId ? eq(uazapiInstances.tenantId, tenantId) : undefined)
    .orderBy(desc(uazapiInstances.createdAt));

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    externalId: r.externalId,
    baseUrl: r.baseUrl,
    instanceName: r.instanceName,
  }));
}

export type GoogleAdsAccountAdminRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  externalId: string;
  label: string | null;
  currencyCode: string | null;
};

export async function listGoogleAdsAccounts(tenantId?: string): Promise<GoogleAdsAccountAdminRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: googleAdsAccounts.id,
      tenantId: googleAdsAccounts.tenantId,
      tenantName: tenants.name,
      externalId: googleAdsAccounts.externalId,
      label: googleAdsAccounts.label,
      currencyCode: googleAdsAccounts.currencyCode,
    })
    .from(googleAdsAccounts)
    .innerJoin(tenants, eq(googleAdsAccounts.tenantId, tenants.id))
    .where(tenantId ? eq(googleAdsAccounts.tenantId, tenantId) : undefined)
    .orderBy(desc(googleAdsAccounts.createdAt));

  return rows.map((row) => ({
    id: row.id,
    tenantId: row.tenantId,
    tenantName: row.tenantName,
    externalId: row.externalId,
    label: row.label,
    currencyCode: row.currencyCode,
  }));
}
