import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { evolutionInstances } from "@/db/schema";
import { getEvolutionInstanceSecret } from "./credentials";

export interface ProviderInstanceStatus {
  instanceId: string;
  tenantId: string;
  provider: "evolution";
  ok: boolean;
  status: string;
  latencyMs: number;
  details?: Record<string, unknown>;
}

async function requestWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchEvolutionStatuses(): Promise<ProviderInstanceStatus[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: evolutionInstances.id,
      tenantId: evolutionInstances.tenantId,
      baseUrl: evolutionInstances.baseUrl,
      externalId: evolutionInstances.externalId,
    })
    .from(evolutionInstances);

  return Promise.all(
    rows.map(async (row) => {
      const start = Date.now();
      try {
        const secret = await getEvolutionInstanceSecret(row.id);
        const response = await requestWithTimeout(
          `${row.baseUrl.replace(/\/$/, "")}/health`,
          {
            method: "GET",
            headers: secret ? { apikey: secret } : undefined,
          },
          7000
        );

        return {
          instanceId: row.id,
          tenantId: row.tenantId,
          provider: "evolution" as const,
          ok: response.ok,
          status: response.ok ? "online" : `http_${response.status}`,
          latencyMs: Date.now() - start,
          details: { externalId: row.externalId },
        };
      } catch (err) {
        return {
          instanceId: row.id,
          tenantId: row.tenantId,
          provider: "evolution" as const,
          ok: false,
          status: "unreachable",
          latencyMs: Date.now() - start,
          details: {
            externalId: row.externalId,
            error: err instanceof Error ? err.message : String(err),
          },
        };
      }
    })
  );
}
