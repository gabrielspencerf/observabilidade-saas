import { and, eq } from "drizzle-orm";
import { contacts } from "@/db/schema";
import { getDb } from "@/server/db";

function normalizePhoneFromRemoteJid(remoteJid: string): string | null {
  const base = remoteJid.split("@")[0] ?? "";
  const digits = base.replace(/\D/g, "");
  return digits || null;
}

/**
 * Cria/resolve contato a partir do identificador remoto da conversa (ex.: 5511999999999@s.whatsapp.net).
 * Retorna null quando não for possível extrair telefone.
 */
export async function findOrCreateContactFromRemoteJid(input: {
  tenantId: string;
  remoteJid: string;
}): Promise<string | null> {
  const normalizedPhone = normalizePhoneFromRemoteJid(input.remoteJid);
  if (!normalizedPhone) return null;

  const db = getDb();
  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        eq(contacts.tenantId, input.tenantId),
        eq(contacts.normalizedPhone, normalizedPhone)
      )
    )
    .limit(1);

  if (existing) return existing.id;

  try {
    const [created] = await db
      .insert(contacts)
      .values({
        tenantId: input.tenantId,
        phone: normalizedPhone,
        normalizedPhone,
        source: "conversation",
      })
      .returning({ id: contacts.id });

    if (created) return created.id;
  } catch {
    // Corrida de concorrência em índice único: busca novamente abaixo.
  }

  const [afterRace] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        eq(contacts.tenantId, input.tenantId),
        eq(contacts.normalizedPhone, normalizedPhone)
      )
    )
    .limit(1);

  return afterRace?.id ?? null;
}
