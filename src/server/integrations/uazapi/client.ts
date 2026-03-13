import { getDb } from "@/server/db";
import { uazapiInstances } from "@/db/schema";
import { decryptSecret } from "@/server/security/secret-crypto";

export interface UazapiInstanceStatus {
  instanceId: string;
  tenantId: string;
  provider: "uazapi";
  ok: boolean;
  status: string;
  latencyMs: number;
  details?: Record<string, unknown>;
}

function resolveApiKey(encrypted: string | null): string | null {
  if (!encrypted) return null;
  try {
    return decryptSecret(encrypted);
  } catch {
    return encrypted;
  }
}

export async function fetchUazapiStatuses(): Promise<UazapiInstanceStatus[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: uazapiInstances.id,
      tenantId: uazapiInstances.tenantId,
      baseUrl: uazapiInstances.baseUrl,
      externalId: uazapiInstances.externalId,
      apiKeyEncrypted: uazapiInstances.apiKeyEncrypted,
    })
    .from(uazapiInstances);

  return Promise.all(
    rows.map(async (row) => {
      const start = Date.now();
      try {
        const apiKey = resolveApiKey(row.apiKeyEncrypted);
        const response = await fetch(`${row.baseUrl.replace(/\/$/, "")}/health`, {
          method: "GET",
          headers: apiKey ? { apikey: apiKey } : undefined,
        });
        return {
          instanceId: row.id,
          tenantId: row.tenantId,
          provider: "uazapi" as const,
          ok: response.ok,
          status: response.ok ? "online" : `http_${response.status}`,
          latencyMs: Date.now() - start,
          details: { externalId: row.externalId },
        };
      } catch (err) {
        return {
          instanceId: row.id,
          tenantId: row.tenantId,
          provider: "uazapi" as const,
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
