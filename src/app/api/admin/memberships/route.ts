/**
 * POST /api/admin/memberships — vincular usuário a tenant com role (super_admin).
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { createMembership } from "@/server/admin/memberships";
import { recordTenantActivity } from "@/server/tenancy/tenant-activity";
import { adminApiAuthErrorResponse } from "@/server/admin/api-route-errors";
import { apiError, apiOk } from "@/server/http/api-contract";

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }

  let body: { user_id?: string; tenant_id?: string; role_slug?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Corpo inválido", { status: 400 });
  }

  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id.trim() : "";
  const roleSlug = typeof body.role_slug === "string" ? body.role_slug.trim() : "";

  if (!userId || !tenantId || !roleSlug) {
    return apiError(
      "invalid_payload",
      "user_id, tenant_id e role_slug são obrigatórios",
      { status: 400 }
    );
  }

  const result = await createMembership({
    userId,
    tenantId,
    roleSlug,
    invitedBy: session.user.id,
  });

  if ("error" in result) {
    if (result.error === "Este usuário já possui membership neste tenant") {
      return apiError("duplicate_resource", result.error, { status: 409 });
    }
    return apiError("invalid_payload", result.error, { status: 400 });
  }
  await recordTenantActivity({
    tenantId,
    actorUserId: session.user.id,
    scope: "users_memberships",
    action: "create",
    notificationType: "membership_created",
    title: "Membership criado",
    message: "Um usuário foi vinculado ao tenant.",
    resourceType: "membership",
    resourceId: result.id,
    newValues: {
      userId,
      tenantId,
      roleSlug,
    },
    metadata: {
      membershipId: result.id,
    },
  });
  return apiOk({ id: result.id }, { status: 201 });
}
