import { sql } from "drizzle-orm";
import { env } from "@/config/env";
import { getRootDb } from "./index";
import type { Database } from "./index";
import { tenantDbAsyncLocalStorage } from "./tx-context";

export interface DbAccessContextInput {
  tenantId: string | null;
  bypassRls?: boolean;
}

/**
 * Aplica GUCs usados pelas políticas RLS (migration 0016).
 * `is_local = true` → equivalente a SET LOCAL (válido dentro da transação atual).
 */
export async function applyRlsGucs(
  db: Database,
  input: DbAccessContextInput
): Promise<void> {
  const tenantId = input.tenantId?.trim() || "";
  const bypass = input.bypassRls === true ? "on" : "off";
  const enforce = env.securityEnforceRls ? "on" : "off";

  await db.execute(
    sql`select
      set_config('app.current_tenant_id', ${tenantId}, true),
      set_config('app.bypass_rls', ${bypass}, true),
      set_config('app.enforce_rls', ${enforce}, true)
    `
  );
}

/**
 * Atualiza GUCs no meio de uma transação já aberta por `runWithRlsContext`.
 */
export async function applyRlsToCurrentTransaction(
  input: DbAccessContextInput
): Promise<void> {
  const db = tenantDbAsyncLocalStorage.getStore();
  if (!db) {
    throw new Error(
      "applyRlsToCurrentTransaction: fora de runWithRlsContext — contexto RLS ausente"
    );
  }
  await applyRlsGucs(db, input);
}

/**
 * Executa `fn` dentro de uma transação Postgres com GUCs RLS no escopo LOCAL
 * (sem estado global na conexão após o commit).
 *
 * Exemplo:
 * ```ts
 * await runWithRlsContext({ tenantId: sessionTenantId, bypassRls: false }, async () => {
 *   return getDb().select().from(leads).where(eq(leads.tenantId, sessionTenantId));
 * });
 * ```
 */
export async function runWithRlsContext<T>(
  input: DbAccessContextInput,
  fn: () => Promise<T>
): Promise<T> {
  const root = getRootDb();
  return await root.transaction(async (tx) => {
    await applyRlsGucs(tx as Database, input);
    return tenantDbAsyncLocalStorage.run(tx as Database, fn);
  });
}
