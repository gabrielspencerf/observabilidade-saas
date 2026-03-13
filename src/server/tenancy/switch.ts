/**
 * Lógica de troca de tenant: validar membership e atualizar sessão.
 */
import { updateSessionTenant } from "@/server/auth";
import { canAssumeTenant } from "./membership";

export interface SwitchTenantResult {
  ok: boolean;
  error?: "forbidden" | "not_found";
}

/**
 * Troca o tenant atual da sessão se o usuário tiver membership no tenant.
 * Não cria nova sessão; apenas atualiza current_tenant_id.
 */
export async function switchTenant(
  sessionId: string,
  userId: string,
  tenantId: string
): Promise<SwitchTenantResult> {
  const allowed = await canAssumeTenant(userId, tenantId);
  if (!allowed) {
    return { ok: false, error: "forbidden" };
  }
  await updateSessionTenant(sessionId, tenantId);
  return { ok: true };
}
