/**
 * Escolha do current_tenant_id inicial ao logar.
 * Regras:
 * - 0 memberships → null (ex.: super_admin pode operar no admin central sem tenant).
 * - 1 membership → esse tenant.
 * - 2+ memberships → primeiro por ordem de nome do tenant (estável); UX de troca na próxima etapa.
 */

export interface MembershipWithTenant {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
}

export function chooseInitialTenantId(
  memberships: MembershipWithTenant[]
): string | null {
  if (memberships.length === 0) return null;
  if (memberships.length === 1) return memberships[0].tenantId;
  const sorted = [...memberships].sort((a, b) =>
    a.tenantName.localeCompare(b.tenantName)
  );
  return sorted[0].tenantId;
}
