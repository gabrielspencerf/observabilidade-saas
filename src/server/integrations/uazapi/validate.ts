/**
 * Validar request webhook UAZAPI: identificar instance + tenant pela URL.
 * instanceId na URL = uazapi_instances.id (UUID). Paridade com Evolution.
 */

import { eq } from "drizzle-orm";
import { env } from "@/config/env";
import { getDb } from "@/server/db";
import { uazapiInstances } from "@/db/schema";
import { verifyWebhookSignature } from "@/server/security/webhook-signature";
import { getUazapiInstanceSecret } from "./credentials";

export interface UazapiWebhookContext {
  tenantId: string;
  uazapiInstanceId: string;
}

export async function validateUazapiWebhook(
  request: Request,
  instanceIdOrToken: string,
  rawBody: string
): Promise<UazapiWebhookContext | { error: string; status: number }> {
  const trimmed = instanceIdOrToken.trim();
  if (!trimmed) {
    return { error: "Instance identifier required", status: 400 };
  }

  const db = getDb();
  const [instance] = await db
    .select({
      id: uazapiInstances.id,
      tenantId: uazapiInstances.tenantId,
    })
    .from(uazapiInstances)
    .where(eq(uazapiInstances.id, trimmed))
    .limit(1);

  if (!instance) {
    return { error: "Instance not found", status: 404 };
  }

  const secret = await getUazapiInstanceSecret(instance.id);
  if (env.isProduction && !secret?.trim()) {
    return {
      error:
        "Instância sem credencial secreta configurada para validação do webhook",
      status: 503,
    };
  }

  if (secret?.trim()) {
    const check = verifyWebhookSignature({
      timestampHeader: request.headers.get("x-webhook-timestamp"),
      signatureHeader: request.headers.get("x-webhook-signature"),
      rawBody,
      secret: secret.trim(),
    });
    if (!check.ok) {
      return { error: check.error, status: check.status };
    }
  }

  return {
    tenantId: instance.tenantId,
    uazapiInstanceId: instance.id,
  };
}
