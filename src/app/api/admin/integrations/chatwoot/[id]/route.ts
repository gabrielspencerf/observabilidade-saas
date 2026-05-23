/**
 * GET /api/admin/integrations/chatwoot/[id] — detalhe (sem secrets).
 * PATCH /api/admin/integrations/chatwoot/[id] — atualiza campos editáveis.
 *   Body: { external_id?, base_url?, inbox_id?, label?, api_token? }
 *   - api_token: string vazia remove; ausente mantém.
 * DELETE /api/admin/integrations/chatwoot/[id] — exclui a conta.
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { deleteChatwootAccount } from "@/server/admin/integrations-delete";
import {
  getChatwootAccountById,
  updateChatwootAccountById,
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
    return apiError("resource_required", "ID obrigatório", { status: 400 });
  }
  const result = await getChatwootAccountById(id.trim());
  if ("error" in result) {
    return apiError("not_found", "Conta não encontrada", { status: 404 });
  }
  return apiOk(result);
}

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
  if (!id?.trim()) {
    return apiError("resource_required", "ID obrigatório", { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Corpo inválido", { status: 400 });
  }
  const result = await updateChatwootAccountById({
    id: id.trim(),
    externalId:
      typeof body.external_id === "string" ? body.external_id : undefined,
    baseUrl: typeof body.base_url === "string" ? body.base_url : undefined,
    inboxId:
      body.inbox_id === undefined
        ? undefined
        : typeof body.inbox_id === "string"
          ? body.inbox_id
          : null,
    label:
      body.label === undefined
        ? undefined
        : typeof body.label === "string"
          ? body.label
          : null,
    apiToken:
      body.api_token === undefined
        ? undefined
        : typeof body.api_token === "string"
          ? body.api_token
          : null,
    actorUserId: session.user.id,
  });
  if ("error" in result) {
    if (result.error === "not_found") {
      return apiError("not_found", "Conta não encontrada", { status: 404 });
    }
    return apiError(
      "duplicate_resource",
      "Já existe uma conta Chatwoot com este external_id no tenant",
      { status: 409 }
    );
  }
  return apiOk(result);
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
  if (!id?.trim()) {
    return apiError("resource_required", "ID obrigatório", { status: 400 });
  }
  const result = await deleteChatwootAccount(id.trim(), session.user.id);
  if ("error" in result) {
    const notFound = result.error.includes("não encontrada");
    return apiError(notFound ? "not_found" : "internal_error", result.error, {
      status: notFound ? 404 : 500,
    });
  }
  return apiOk({ ok: true });
}
