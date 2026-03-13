/**
 * Memberships do usuário: listar tenants acessíveis e papel no tenant atual.
 */
import { eq, and } from "drizzle-orm";
import { getDb } from "@/server/db";
import { memberships, tenants, roles } from "@/db/schema";

export interface MembershipItem {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  roleId: string;
  roleSlug: string;
}

/**
 * Lista todos os tenants em que o usuário tem membership (com role).
 */
export async function getMembershipsForUser(userId: string): Promise<MembershipItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      roleId: roles.id,
      roleSlug: roles.slug,
    })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(eq(memberships.userId, userId));

  return rows.map((r) => ({
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    tenantSlug: r.tenantSlug,
    roleId: r.roleId,
    roleSlug: r.roleSlug,
  }));
}

/**
 * Membership do usuário no tenant atual (se houver). Retorna null se currentTenantId for null ou sem membership.
 */
export async function getCurrentMembership(
  userId: string,
  currentTenantId: string | null
): Promise<MembershipItem | null> {
  if (!currentTenantId) return null;
  const db = getDb();
  const [row] = await db
    .select({
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      roleId: roles.id,
      roleSlug: roles.slug,
    })
    .from(memberships)
    .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(and(eq(memberships.userId, userId), eq(memberships.tenantId, currentTenantId)))
    .limit(1);

  if (!row) return null;
  return {
    tenantId: row.tenantId,
    tenantName: row.tenantName,
    tenantSlug: row.tenantSlug,
    roleId: row.roleId,
    roleSlug: row.roleSlug,
  };
}

/**
 * Verifica se o usuário pode assumir o tenant (tem membership nesse tenant).
 */
export async function canAssumeTenant(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId)))
    .limit(1);
  return !!row;
}

/**
 * Verifica se o usuário é super_admin em algum tenant (acesso global ao admin).
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const list = await getMembershipsForUser(userId);
  return list.some((m) => m.roleSlug === "super_admin");
}
