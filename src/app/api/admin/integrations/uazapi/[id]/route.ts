/**
 * GET/PATCH/DELETE /api/admin/integrations/uazapi/[id] — gestão de instância UAZAPI (super_admin).
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { deleteUazapiInstance } from "@/server/admin/integrations-delete";
import {
  getUazapiInstanceById,
  updateUazapiInstanceById,
} from "@/server/admin/integrations-update";
import { validateUazapiCredential } from "@/lib/uazapi-credentials";
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

  const result = await getUazapiInstanceById(id.trim());
  if ("error" in result) {
    return apiError("not_found", "Instância UAZAPI não encontrada", { status: 404 });
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
    token?: string;
    admin_token?: string;
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
  const credentialError = validateUazapiCredential({
    apiKey: body.api_key ?? null,
    token: body.token ?? null,
    adminToken: body.admin_token ?? null,
  });
  if (credentialError) {
    return apiError("invalid_payload", credentialError, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof updateUazapiInstanceById>>;
  try {
    result = await updateUazapiInstanceById({
      id: id.trim(),
      externalId,
      baseUrl,
      instanceName: body.instance_name ?? null,
      apiKey: body.api_key ?? null,
      token: body.token ?? null,
      adminToken: body.admin_token ?? null,
      actorUserId: adminSession.user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("INTEGRATIONS_ENCRYPTION_KEY") ||
      message.includes("CONFIG_ENCRYPTION_KEY") ||
      message.includes("Chave inválida")
    ) {
      return apiError(
        "encryption_misconfigured",
        "Não foi possível salvar a credencial por configuração de criptografia. Defina INTEGRATIONS_ENCRYPTION_KEY/CONFIG_ENCRYPTION_KEY.",
        { status: 500 }
      );
    }
    return apiError(
      "internal_error",
      "Erro interno ao atualizar instância UAZAPI",
      { status: 500 }
    );
  }

  if ("error" in result) {
    if (result.error === "not_found") {
      return apiError("not_found", "Instância UAZAPI não encontrada", {
        status: 404,
      });
    }
    return apiError(
      "duplicate_resource",
      "Já existe uma instância UAZAPI com este tenant e external_id",
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

  const result = await deleteUazapiInstance(id.trim(), adminSession.user.id);
  if ("error" in result) {
    const notFound = result.error.includes("não encontrada");
    return apiError(notFound ? "not_found" : "internal_error", result.error, {
      status: notFound ? 404 : 500,
    });
  }
  return apiOk({ ok: true });
}
