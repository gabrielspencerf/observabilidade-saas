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

export async function getIntegrationStats(): Promise<IntegrationStats> {
  const db = getDb();
  const [typebot] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(typebotBots);
  const [evolution] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(evolutionInstances);
  const [googleAds] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(googleAdsAccounts);
  const [uazapi] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(uazapiInstances);

  return {
    typebotBots: typebot?.value ?? 0,
    evolutionInstances: evolution?.value ?? 0,
    uazapiInstances: uazapi?.value ?? 0,
    googleAdsAccounts: googleAds?.value ?? 0,
  };
}

export type TypebotBotRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  externalId: string;
  name: string | null;
};

export async function listTypebotBots(): Promise<TypebotBotRow[]> {
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

export async function listEvolutionInstances(): Promise<EvolutionInstanceRow[]> {
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

export async function listUazapiInstances(): Promise<UazapiInstanceRow[]> {
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
