/**
 * Excluir integrações (Evolution, Typebot, UAZAPI). Chamador deve usar requireAdmin.
 * FK em cascade: ao excluir instância, eventos brutos e conversas vinculadas são removidos.
 */
import { and, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  evolutionInstances,
  typebotBots,
  uazapiInstances,
  integrations,
} from "@/db/schema";

export async function deleteEvolutionInstance(
  instanceId: string
): Promise<{ ok: true } | { error: string }> {
  const db = getDb();
  const [row] = await db
    .select({ id: evolutionInstances.id })
    .from(evolutionInstances)
    .where(eq(evolutionInstances.id, instanceId))
    .limit(1);
  if (!row) {
    return { error: "Instância Evolution não encontrada" };
  }
  await db
    .delete(integrations)
    .where(
      and(
        eq(integrations.provider, "evolution"),
        eq(integrations.providerResourceId, instanceId)
      )
    );
  await db.delete(evolutionInstances).where(eq(evolutionInstances.id, instanceId));
  return { ok: true };
}

export async function deleteTypebotBot(
  botId: string
): Promise<{ ok: true } | { error: string }> {
  const db = getDb();
  const [row] = await db
    .select({ id: typebotBots.id })
    .from(typebotBots)
    .where(eq(typebotBots.id, botId))
    .limit(1);
  if (!row) {
    return { error: "Bot Typebot não encontrado" };
  }
  await db
    .delete(integrations)
    .where(
      and(
        eq(integrations.provider, "typebot"),
        eq(integrations.providerResourceId, botId)
      )
    );
  await db.delete(typebotBots).where(eq(typebotBots.id, botId));
  return { ok: true };
}

export async function deleteUazapiInstance(
  instanceId: string
): Promise<{ ok: true } | { error: string }> {
  const db = getDb();
  const [row] = await db
    .select({ id: uazapiInstances.id })
    .from(uazapiInstances)
    .where(eq(uazapiInstances.id, instanceId))
    .limit(1);
  if (!row) {
    return { error: "Instância UAZAPI não encontrada" };
  }
  await db
    .delete(integrations)
    .where(
      and(
        eq(integrations.provider, "uazapi"),
        eq(integrations.providerResourceId, instanceId)
      )
    );
  await db.delete(uazapiInstances).where(eq(uazapiInstances.id, instanceId));
  return { ok: true };
}
