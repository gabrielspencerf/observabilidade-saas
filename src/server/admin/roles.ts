/**
 * Listagem de roles para uso no admin (ex.: dropdown ao criar membership).
 */
import { getDb } from "@/server/db";
import { roles } from "@/db/schema";

export interface RoleOption {
  id: string;
  slug: string;
  name: string;
}

export async function listRoles(): Promise<RoleOption[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: roles.id,
      slug: roles.slug,
      name: roles.name,
    })
    .from(roles)
    .orderBy(roles.slug);
  return rows;
}
