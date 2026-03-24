import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { evolutionInstances, uazapiInstances } from "@/db/schema";

export type MessagingProvider = "evolution" | "uazapi";

export type MessagingInstanceListItem = {
  id: string;
  provider: MessagingProvider;
  label: string;
  externalId: string;
  lastStatus: string | null;
  lastSyncedAt: string | null;
};

export async function listMessagingInstancesForTenant(
  tenantId: string
): Promise<MessagingInstanceListItem[]> {
  const db = getDb();
  const [evoRows, uazRows] = await Promise.all([
    db
      .select({
        id: evolutionInstances.id,
        externalId: evolutionInstances.externalId,
        instanceName: evolutionInstances.instanceName,
        lastStatus: evolutionInstances.lastStatus,
        lastSyncedAt: evolutionInstances.lastSyncedAt,
      })
      .from(evolutionInstances)
      .where(eq(evolutionInstances.tenantId, tenantId)),
    db
      .select({
        id: uazapiInstances.id,
        externalId: uazapiInstances.externalId,
        instanceName: uazapiInstances.instanceName,
        lastStatus: uazapiInstances.lastStatus,
        lastSyncedAt: uazapiInstances.lastSyncedAt,
      })
      .from(uazapiInstances)
      .where(eq(uazapiInstances.tenantId, tenantId)),
  ]);

  const evoMapped: MessagingInstanceListItem[] = evoRows.map((r) => ({
    id: r.id,
    provider: "evolution" as const,
    label: r.instanceName?.trim() || r.externalId,
    externalId: r.externalId,
    lastStatus: r.lastStatus,
    lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
  }));

  const uazMapped: MessagingInstanceListItem[] = uazRows.map((r) => ({
    id: r.id,
    provider: "uazapi" as const,
    label: r.instanceName?.trim() || r.externalId,
    externalId: r.externalId,
    lastStatus: r.lastStatus,
    lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
  }));

  return [...evoMapped, ...uazMapped];
}

export type ResolvedMessagingInstance =
  | {
      provider: "evolution";
      tenantId: string;
      id: string;
      externalId: string;
      baseUrl: string;
    }
  | {
      provider: "uazapi";
      tenantId: string;
      id: string;
      externalId: string;
      baseUrl: string;
    };

export async function resolveMessagingInstanceForTenant(
  tenantId: string,
  instanceId: string
): Promise<ResolvedMessagingInstance | null> {
  const db = getDb();
  const [evo] = await db
    .select({
      id: evolutionInstances.id,
      tenantId: evolutionInstances.tenantId,
      externalId: evolutionInstances.externalId,
      baseUrl: evolutionInstances.baseUrl,
    })
    .from(evolutionInstances)
    .where(
      and(eq(evolutionInstances.id, instanceId), eq(evolutionInstances.tenantId, tenantId))
    )
    .limit(1);
  if (evo) {
    return {
      provider: "evolution",
      tenantId: evo.tenantId,
      id: evo.id,
      externalId: evo.externalId,
      baseUrl: evo.baseUrl,
    };
  }
  const [uaz] = await db
    .select({
      id: uazapiInstances.id,
      tenantId: uazapiInstances.tenantId,
      externalId: uazapiInstances.externalId,
      baseUrl: uazapiInstances.baseUrl,
    })
    .from(uazapiInstances)
    .where(and(eq(uazapiInstances.id, instanceId), eq(uazapiInstances.tenantId, tenantId)))
    .limit(1);
  if (uaz) {
    return {
      provider: "uazapi",
      tenantId: uaz.tenantId,
      id: uaz.id,
      externalId: uaz.externalId,
      baseUrl: uaz.baseUrl,
    };
  }
  return null;
}
