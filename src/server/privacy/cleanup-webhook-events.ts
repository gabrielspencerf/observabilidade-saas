import { and, eq, lt, sql } from "drizzle-orm";
import {
  chatwootWebhookEvents,
  evolutionWebhookEvents,
  typebotWebhookEvents,
  uazapiWebhookEvents,
  whatsappCloudWebhookEvents,
} from "@/db/schema";
import { runWithRlsContext } from "@/server/db/access-context";
import { getDb } from "@/server/db";
import { anonymizeWebhookPayloadForRetention } from "@/server/privacy/webhook-payload-anonymize";

const BATCH = 400;

async function deleteOlderThan90Days(): Promise<void> {
  const db = getDb();
  const cutoff = sql`now() - interval '90 days'`;
  const tables = [
    evolutionWebhookEvents,
    uazapiWebhookEvents,
    typebotWebhookEvents,
    chatwootWebhookEvents,
    whatsappCloudWebhookEvents,
  ] as const;
  for (const table of tables) {
    await db.delete(table).where(lt(table.receivedAt, cutoff));
  }
}

function notYetRedacted(
  payload:
    | typeof evolutionWebhookEvents.payload
    | typeof uazapiWebhookEvents.payload
    | typeof typebotWebhookEvents.payload
    | typeof chatwootWebhookEvents.payload
    | typeof whatsappCloudWebhookEvents.payload
) {
  return sql`coalesce((${payload})->>'__pii_redacted', 'false') <> 'true'`;
}

async function anonymizeBatchForTable(
  table:
    | typeof evolutionWebhookEvents
    | typeof uazapiWebhookEvents
    | typeof typebotWebhookEvents
    | typeof chatwootWebhookEvents
    | typeof whatsappCloudWebhookEvents
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: table.id, payload: table.payload })
    .from(table)
    .where(
      and(
        lt(table.receivedAt, sql`now() - interval '60 days'`),
        notYetRedacted(table.payload)
      )
    )
    .limit(BATCH);

  let n = 0;
  for (const row of rows) {
    const next = anonymizeWebhookPayloadForRetention(row.payload);
    await db.update(table).set({ payload: next }).where(eq(table.id, row.id));
    n += 1;
  }
  return n;
}

/**
 * LGPD: >60 dias anonimiza payload; >90 dias remove linha.
 * Rodar periodicamente (ex.: worker diário).
 */
export async function cleanupWebhookEvents(): Promise<{
  redactedRows: number;
}> {
  return runWithRlsContext({ tenantId: null, bypassRls: true }, async () => {
    await deleteOlderThan90Days();
    let redactedRows = 0;
    const tables = [
      evolutionWebhookEvents,
      uazapiWebhookEvents,
      typebotWebhookEvents,
      chatwootWebhookEvents,
      whatsappCloudWebhookEvents,
    ] as const;
    for (const t of tables) {
      let batch = 0;
      do {
        batch = await anonymizeBatchForTable(t);
        redactedRows += batch;
      } while (batch === BATCH);
    }
    return { redactedRows };
  });
}
