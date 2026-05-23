/**
 * GET/PATCH/DELETE /api/admin/integrations/evolution/[id] — gestão de instância Evolution (super_admin).
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { deleteEvolutionInstance } from "@/server/admin/integrations-delete";
import {
  getEvolutionInstanceById,
  updateEvolutionInstanceById,
} from "@/server/admin/integrations-update";
import { adminApiAuthErrorResponse } from "@/server/admin/api-route-errors";
import { apiError, apiOk } from "@/server/http/api-contract";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }

  const { id } = await params;
  if (!id?.trim()) {
    return apiError("resource_required", "ID da instância é obrigatório", {
      status: 400,
    });
  }

  const result = await getEvolutionInstanceById(id.trim());
  if ("error" in result) {
    return apiError("not_found", "Instância Evolution não encontrada", {
      status: 404,
    });
  }

  return apiOk(result);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let adminSession;
  try {
    adminSession = await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }

  const { id } = await params;
  if (!id?.trim()) {
    return apiError("resource_required", "ID da instância é obrigatório", {
      status: 400,
    });
  }

  let body: {
    external_id?: string;
    base_url?: string;
    instance_name?: string;
    api_key?: string;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Corpo inválido", { status: 400 });
  }

  const externalId = body.external_id?.trim();
  const baseUrl = body.base_url?.trim();
  if (!externalId || !baseUrl) {
    return apiError(
      "invalid_payload",
      "external_id e base_url são obrigatórios",
      { status: 400 }
    );
  }

  const result = await updateEvolutionInstanceById({
    id: id.trim(),
    externalId,
    baseUrl,
    instanceName: body.instance_name ?? null,
    apiKey: body.api_key ?? null,
    actorUserId: adminSession.user.id,
  });

  if ("error" in result) {
    if (result.error === "not_found") {
      return apiError("not_found", "Instância Evolution não encontrada", {
        status: 404,
      });
    }
    return apiError(
      "duplicate_resource",
      "Já existe uma instância Evolution com este tenant e external_id",
      { status: 409 }
    );
  }

  return apiOk(result);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let adminSession;
  try {
    adminSession = await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }

  const { id } = await params;
  if (!id?.trim()) {
    return apiError("resource_required", "ID da instância é obrigatório", {
      status: 400,
    });
  }

  const result = await deleteEvolutionInstance(id.trim(), adminSession.user.id);
  if ("error" in result) {
    const notFound = result.error.includes("não encontrada");
    return apiError(notFound ? "not_found" : "internal_error", result.error, {
      status: notFound ? 404 : 500,
    });
  }
  return apiOk({ ok: true });
}
