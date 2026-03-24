import { sql } from "drizzle-orm";
import { getDb } from "./index";
import { env } from "@/config/env";

export interface DbAccessContextInput {
  tenantId: string | null;
  bypassRls?: boolean;
}

/**
 * Define variáveis de sessão do Postgres para políticas RLS.
 * Usa set_config em escopo de sessão do cliente atual.
 */
export async function setDbAccessContext(input: DbAccessContextInput): Promise<void> {
  const db = getDb();
  const tenantId = input.tenantId?.trim() || "";
  const bypass = input.bypassRls === true ? "on" : "off";
  const enforce = env.securityEnforceRls ? "on" : "off";

  await db.execute(
    sql`select
      set_config('app.current_tenant_id', ${tenantId}, false),
      set_config('app.bypass_rls', ${bypass}, false),
      set_config('app.enforce_rls', ${enforce}, false)
    `
  );
}

/**
 * Reseta contexto de acesso para estado seguro padrão.
 */
export async function resetDbAccessContext(): Promise<void> {
  const db = getDb();
  await db.execute(
    sql`select
      set_config('app.current_tenant_id', '', false),
      set_config('app.bypass_rls', 'off', false),
      set_config('app.enforce_rls', ${env.securityEnforceRls ? "on" : "off"}, false)
    `
  );
}
