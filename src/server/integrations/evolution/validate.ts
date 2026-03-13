/**
 * Validar request webhook Evolution: identificar instance + tenant pela URL.
 * instanceId na URL = evolution_instances.id (UUID). Opcional: validar API key no header.
 * Ver docs/BASE2_ETAPA1.md.
 */

import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { evolutionInstances } from "@/db/schema";
import { verifyWebhookSignature } from "@/server/security/webhook-signature";
import { getEvolutionInstanceSecret } from "./credentials";

export interface EvolutionWebhookContext {
  tenantId: string;
  evolutionInstanceId: string;
}

export async function validateEvolutionWebhook(
  request: Request,
  instanceIdOrToken: string,
  rawBody: string
): Promise<EvolutionWebhookContext | { error: string; status: number }> {
  const trimmed = instanceIdOrToken.trim();
  if (!trimmed) {
    return { error: "Instance identifier required", status: 400 };
  }

  const db = getDb();
  const [instance] = await db
    .select({
      id: evolutionInstances.id,
      tenantId: evolutionInstances.tenantId,
    })
    .from(evolutionInstances)
    .where(eq(evolutionInstances.id, trimmed))
    .limit(1);

  if (!instance) {
    return { error: "Instance not found", status: 404 };
  }

  const secret = await getEvolutionInstanceSecret(instance.id);
  if (secret) {
    const signatureCheck = verifyWebhookSignature({
      timestampHeader: request.headers.get("x-webhook-timestamp"),
      signatureHeader: request.headers.get("x-webhook-signature"),
      rawBody,
      secret,
    });
    if (!signatureCheck.ok) {
      // Compatibilidade para integrações legadas (x-api-key).
      const apiKeyHeader = request.headers.get("x-api-key")?.trim() ?? "";
      if (!apiKeyHeader || apiKeyHeader !== secret) {
        return {
          error: signatureCheck.error,
          status: signatureCheck.status,
        };
      }
    }
  }

  return {
    tenantId: instance.tenantId,
    evolutionInstanceId: instance.id,
  };
}
