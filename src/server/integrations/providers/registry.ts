import { fetchEvolutionStatuses } from "@/server/integrations/evolution";
import { fetchUazapiStatuses } from "@/server/integrations/uazapi";
import type { ProviderAdapter, ProviderStatusItem } from "./types";

const evolutionAdapter: ProviderAdapter = {
  provider: "evolution",
  async fetchStatuses(): Promise<ProviderStatusItem[]> {
    const rows = await fetchEvolutionStatuses();
    return rows.map((row) => ({
      provider: "evolution",
      resourceId: row.instanceId,
      tenantId: row.tenantId,
      ok: row.ok,
      status: row.status,
      latencyMs: row.latencyMs,
      details: row.details,
    }));
  },
};

const uazapiAdapter: ProviderAdapter = {
  provider: "uazapi",
  async fetchStatuses(): Promise<ProviderStatusItem[]> {
    const rows = await fetchUazapiStatuses();
    return rows.map((row) => ({
      provider: "uazapi",
      resourceId: row.instanceId,
      tenantId: row.tenantId,
      ok: row.ok,
      status: row.status,
      latencyMs: row.latencyMs,
      details: row.details,
    }));
  },
};

export const providerRegistry: ProviderAdapter[] = [
  evolutionAdapter,
  uazapiAdapter,
];
