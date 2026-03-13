/**
 * POST /api/google-ads/sync/[accountId]
 * Dispara sync sob demanda para uma conta. Exige sessão e que a conta pertença ao tenant atual.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/server/auth";
import { getCurrentMembership } from "@/server/tenancy/membership";
import { getGoogleAdsAccountById } from "@/server/integrations/google-ads";
import { createRedisClient } from "@/server/redis";
import { enqueue } from "@/workers/queue";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ accountId: string }> }
) {
  const cookie = _request.headers.get("cookie") ?? "";
  const req = new Request(_request.url, { headers: cookie ? { cookie } : {} });
  const session = await getCurrentSession(req);

  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const currentTenantId = session.session.currentTenantId;
  if (!currentTenantId) {
    return NextResponse.json(
      { error: "Selecione um tenant" },
      { status: 400 }
    );
  }

  const membership = await getCurrentMembership(
    session.user.id,
    currentTenantId
  );
  if (!membership) {
    return NextResponse.json(
      { error: "Sem acesso a este tenant" },
      { status: 403 }
    );
  }

  const { accountId } = await context.params;
  if (!accountId) {
    return NextResponse.json(
      { error: "accountId é obrigatório" },
      { status: 400 }
    );
  }

  const account = await getGoogleAdsAccountById(accountId);
  if (!account) {
    return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
  }
  if (account.tenantId !== currentTenantId) {
    return NextResponse.json(
      { error: "Conta não pertence ao tenant atual" },
      { status: 403 }
    );
  }

  const redis = createRedisClient();
  try {
    await enqueue(redis, {
      type: "sync_google_ads_account",
      accountId,
    });
  } finally {
    redis.quit();
  }

  const url = new URL(_request.url);
  const redirectTo = `${url.origin}/dashboard/google-ads?sync=enqueued`;
  return NextResponse.redirect(redirectTo, { status: 302 });
}
