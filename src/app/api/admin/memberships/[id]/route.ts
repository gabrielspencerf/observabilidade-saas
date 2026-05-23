/**
 * PATCH /api/admin/memberships/[id] — trocar role do membership.
 * DELETE /api/admin/memberships/[id] — remover membership do usuário/tenant.
 *
 * Apenas super_admin global (requireAdmin). Registra atividade no tenant.
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import {
  updateMembershipRole,
  deleteMembership,
} from "@/server/admin/memberships";
import { recordTenantActivity } from "@/server/tenancy/tenant-activity";
import { adminApiAuthErrorResponse } from "@/server/admin/api-route-errors";
import { apiError, apiOk } from "@/server/http/api-contract";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }

  const { id } = await params;
  if (!id) {
    return apiError("resource_required", "id obrigatório", { status: 400 });
  }

  let body: { role_slug?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Corpo inválido", { status: 400 });
  }
  const roleSlug = typeof body.role_slug === "string" ? body.role_slug.trim() : "";
  if (!roleSlug) {
    return apiError("invalid_payload", "role_slug é obrigatório", { status: 400 });
  }

  const result = await updateMembershipRole({ membershipId: id, roleSlug });
  if ("error" in result) {
    if (result.error === "Membership não encontrado") {
      return apiError("not_found", result.error, { status: 404 });
    }
    return apiError("invalid_payload", result.error, { status: 400 });
  }
  await recordTenantActivity({
    tenantId: result.tenantId,
    actorUserId: session.user.id,
    scope: "users_memberships",
    action: "update",
    notificationType: "membership_updated",
    title: "Role do membership atualizada",
    message: `Role alterada para ${roleSlug}.`,
    resourceType: "membership",
    resourceId: id,
    newValues: { roleSlug, userId: result.userId },
  });
  return apiOk({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }

  const { id } = await params;
  if (!id) {
    return apiError("resource_required", "id obrigatório", { status: 400 });
  }

  const result = await deleteMembership(id);
  if ("error" in result) {
    return apiError(
      result.error === "Membership não encontrado" ? "not_found" : "invalid_payload",
      result.error,
      { status: result.error === "Membership não encontrado" ? 404 : 400 }
    );
  }
  await recordTenantActivity({
    tenantId: result.tenantId,
    actorUserId: session.user.id,
    scope: "users_memberships",
    action: "delete",
    notificationType: "membership_deleted",
    title: "Membership removido",
    message: "Usuário desvinculado do tenant.",
    resourceType: "membership",
    resourceId: id,
    newValues: { userId: result.userId },
  });
  return apiOk({ ok: true });
}
