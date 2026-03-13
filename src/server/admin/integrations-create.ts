/**
 * Criar Typebot bot e Evolution instance (admin). Chamador deve usar requireAdmin.
 */
import { getDb } from "@/server/db";
import { typebotBots, evolutionInstances, integrations, uazapiInstances } from "@/db/schema";
import { hashWebhookSecret } from "@/server/integrations/webhook-secret";
import { encryptSecret } from "@/server/security/secret-crypto";

async function ensureIntegrationRecord(args: {
  tenantId: string;
  provider: "typebot" | "evolution" | "uazapi";
  name: string;
  providerResourceId: string;
}) {
  const db = getDb();
  await db
    .insert(integrations)
    .values({
      tenantId: args.tenantId,
      provider: args.provider,
      name: args.name,
      providerResourceId: args.providerResourceId,
      isActive: true,
    })
    .onConflictDoNothing();
}

export interface CreateTypebotBotInput {
  tenantId: string;
  externalId: string;
  name?: string | null;
  webhookSecret?: string | null;
  apiToken?: string | null;
  metricsApiBaseUrl?: string | null;
}

export async function createTypebotBot(input: CreateTypebotBotInput) {
  const db = getDb();
  const webhookSecretHash =
    input.webhookSecret?.trim() ?
      hashWebhookSecret(input.webhookSecret.trim())
    : null;
  const webhookSecretEncrypted =
    input.webhookSecret?.trim() ? encryptSecret(input.webhookSecret.trim()) : null;
  const apiTokenEncrypted =
    input.apiToken?.trim() ? encryptSecret(input.apiToken.trim()) : null;
  const metricsApiBaseUrl =
    input.metricsApiBaseUrl?.trim() ? input.metricsApiBaseUrl.trim().replace(/\/$/, "") : null;

  try {
    const [row] = await db
      .insert(typebotBots)
      .values({
        tenantId: input.tenantId,
        externalId: input.externalId.trim(),
        name: input.name?.trim() || null,
        webhookSecretHash,
        webhookSecretEncrypted,
        apiTokenEncrypted,
        metricsApiBaseUrl,
      })
      .returning({
        id: typebotBots.id,
        tenantId: typebotBots.tenantId,
        externalId: typebotBots.externalId,
        name: typebotBots.name,
      });

    if (!row) {
      return { error: "Falha ao criar bot" };
    }
    await ensureIntegrationRecord({
      tenantId: row.tenantId,
      provider: "typebot",
      name: row.name?.trim() || row.externalId,
      providerResourceId: row.id,
    });
    return { id: row.id, tenantId: row.tenantId, externalId: row.externalId, name: row.name };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { error: "Já existe um bot com este tenant e external_id" };
    }
    throw err;
  }
}

export interface CreateEvolutionInstanceInput {
  tenantId: string;
  externalId: string;
  baseUrl: string;
  apiKey?: string | null;
  instanceName?: string | null;
}

export async function createEvolutionInstance(input: CreateEvolutionInstanceInput) {
  const db = getDb();
  const baseUrl = input.baseUrl.replace(/\/$/, "");
  const apiKeyEncrypted =
    input.apiKey?.trim() ? encryptSecret(input.apiKey.trim()) : null;

  try {
    const [row] = await db
      .insert(evolutionInstances)
      .values({
        tenantId: input.tenantId,
        externalId: input.externalId.trim(),
        baseUrl,
        apiKeyEncrypted,
        instanceName: input.instanceName?.trim() || null,
      })
      .returning({
        id: evolutionInstances.id,
        tenantId: evolutionInstances.tenantId,
        externalId: evolutionInstances.externalId,
        baseUrl: evolutionInstances.baseUrl,
        instanceName: evolutionInstances.instanceName,
      });

    if (!row) {
      return { error: "Falha ao criar instância" };
    }
    await ensureIntegrationRecord({
      tenantId: row.tenantId,
      provider: "evolution",
      name: row.instanceName?.trim() || row.externalId,
      providerResourceId: row.id,
    });
    return {
      id: row.id,
      tenantId: row.tenantId,
      externalId: row.externalId,
      baseUrl: row.baseUrl,
      instanceName: row.instanceName,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { error: "Já existe uma instância com este tenant e external_id" };
    }
    throw err;
  }
}

export interface CreateUazapiInstanceInput {
  tenantId: string;
  externalId: string;
  baseUrl: string;
  apiKey?: string | null;
  instanceName?: string | null;
}

export async function createUazapiInstance(input: CreateUazapiInstanceInput) {
  const db = getDb();
  const baseUrl = input.baseUrl.replace(/\/$/, "");
  const apiKeyEncrypted =
    input.apiKey?.trim() ? encryptSecret(input.apiKey.trim()) : null;

  try {
    const [row] = await db
      .insert(uazapiInstances)
      .values({
        tenantId: input.tenantId,
        externalId: input.externalId.trim(),
        baseUrl,
        apiKeyEncrypted,
        instanceName: input.instanceName?.trim() || null,
      })
      .returning({
        id: uazapiInstances.id,
        tenantId: uazapiInstances.tenantId,
        externalId: uazapiInstances.externalId,
        baseUrl: uazapiInstances.baseUrl,
        instanceName: uazapiInstances.instanceName,
      });

    if (!row) {
      return { error: "Falha ao criar instância UAZAPI" };
    }

    await ensureIntegrationRecord({
      tenantId: row.tenantId,
      provider: "uazapi",
      name: row.instanceName?.trim() || row.externalId,
      providerResourceId: row.id,
    });

    return {
      id: row.id,
      tenantId: row.tenantId,
      externalId: row.externalId,
      baseUrl: row.baseUrl,
      instanceName: row.instanceName,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { error: "Já existe uma instância UAZAPI com este tenant e external_id" };
    }
    throw err;
  }
}
