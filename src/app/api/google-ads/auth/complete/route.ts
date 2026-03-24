/**
 * POST /api/google-ads/auth/complete
 * Completa a conexão OAuth: valida pending, verifica que externalId está na lista, persiste conta e redireciona.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/auth";
import { getCurrentMembership } from "@/server/tenancy/membership";
import { saveOrUpdateGoogleAdsAccount } from "@/server/integrations/google-ads";
import { consumePendingConnection } from "@/server/google-ads-pending";

function redirectError(request: NextRequest, code: string, message?: string) {
  const url = new URL("/dashboard/google-ads", request.url);
  url.searchParams.set("google_ads_error", code);
  if (message) url.searchParams.set("google_ads_message", message);
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAuth(request);
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e.status === 403) {
      return redirectError(request, "csrf", "Sessão de segurança inválida. Atualize a página e tente de novo.");
    }
    return redirectError(request, "unauthorized", "Não autenticado");
  }

  const currentTenantId = session.session.currentTenantId;
  if (!currentTenantId) {
    return redirectError(request, "no_tenant", "Selecione um tenant");
  }

  const membership = await getCurrentMembership(
    session.user.id,
    currentTenantId
  );
  if (!membership) {
    return redirectError(request, "forbidden", "Sem acesso a este tenant");
  }

  let body: { pending?: string; externalId?: string; label?: string };
  try {
    const formData = await request.formData();
    body = {
      pending: formData.get("pending")?.toString(),
      externalId: formData.get("externalId")?.toString(),
      label: formData.get("label")?.toString() || undefined,
    };
  } catch {
    return redirectError(request, "invalid_body", "Dados inválidos");
  }

  const pendingToken = body.pending;
  const externalId = body.externalId;

  if (!pendingToken || !externalId) {
    return redirectError(
      request,
      "missing_params",
      "Token ou conta não informados"
    );
  }

  const payload = await consumePendingConnection(pendingToken, currentTenantId);
  if (!payload) {
    return redirectError(
      request,
      "invalid_pending",
      "Link expirado ou já utilizado"
    );
  }

  if (!payload.customerIds.includes(externalId)) {
    return redirectError(
      request,
      "invalid_account",
      "Conta não está na lista de acessíveis"
    );
  }

  const expiresAt = new Date(payload.tokenExpiresAt);
  const saveResult = await saveOrUpdateGoogleAdsAccount({
    tenantId: currentTenantId,
    externalId,
    refreshTokenEncrypted: payload.refreshTokenEncrypted,
    accessTokenEncrypted: payload.accessTokenEncrypted,
    tokenExpiresAt: expiresAt,
    label: body.label ?? null,
  });

  if ("error" in saveResult) {
    return redirectError(request, "save_failed", saveResult.error);
  }

  const url = new URL("/dashboard/google-ads", request.url);
  url.searchParams.set("google_ads", "connected");
  return NextResponse.redirect(url);
}
