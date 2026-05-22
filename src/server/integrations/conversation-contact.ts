import { and, eq, isNull, or } from "drizzle-orm";
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

function normalizeDigitsPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

/**
 * Resolve ou cria contato a partir de telefone e/ou e-mail (ex.: payload Chatwoot / WhatsApp Cloud).
 * Telefone é armazenado apenas com dígitos; e-mail em minúsculas.
 */
export async function findOrCreateContactFromPhoneOrEmail(input: {
  tenantId: string;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
}): Promise<string | null> {
  const normalizedPhone = input.phone
    ? normalizeDigitsPhone(input.phone)
    : null;
  const normalizedEmail = input.email?.trim().toLowerCase() || null;

  if (!normalizedPhone && !normalizedEmail) return null;

  const db = getDb();

  const conditions = [];
  if (normalizedPhone) {
    conditions.push(
      and(
        eq(contacts.tenantId, input.tenantId),
        eq(contacts.normalizedPhone, normalizedPhone)
      )
    );
  }
  if (normalizedEmail) {
    conditions.push(
      and(
        eq(contacts.tenantId, input.tenantId),
        eq(contacts.normalizedEmail, normalizedEmail)
      )
    );
  }

  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(or(...conditions))
    .limit(1);

  if (existing?.id) {
    if (input.name?.trim()) {
      await db
        .update(contacts)
        .set({ name: input.name.trim() })
        .where(and(eq(contacts.id, existing.id), isNull(contacts.name)))
        .catch(() => {});
    }
    return existing.id;
  }

  const phoneCol = normalizedPhone ?? null;
  const emailCol = normalizedEmail ?? null;

  try {
    const [created] = await db
      .insert(contacts)
      .values({
        tenantId: input.tenantId,
        name: input.name?.trim() || null,
        phone: phoneCol,
        normalizedPhone: phoneCol,
        email: emailCol,
        normalizedEmail: emailCol,
        source: "conversation",
      })
      .returning({ id: contacts.id });

    if (created) return created.id;
  } catch {
    // concorrência em índice único
  }

  const [afterRace] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(or(...conditions))
    .limit(1);

  return afterRace?.id ?? null;
}

/**
 * Contato a partir do wa_id do WhatsApp Cloud (apenas dígitos).
 */
export async function findOrCreateContactFromWaId(input: {
  tenantId: string;
  waId: string;
  displayName?: string | null;
}): Promise<string | null> {
  const digits = normalizeDigitsPhone(input.waId);
  if (!digits) return null;
  return findOrCreateContactFromPhoneOrEmail({
    tenantId: input.tenantId,
    phone: digits,
    name: input.displayName ?? null,
  });
}
