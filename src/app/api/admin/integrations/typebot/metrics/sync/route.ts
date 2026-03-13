import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { syncTypebotMetricsForBot } from "@/server/integrations/typebot";
import { checkRateLimit } from "@/server/security/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: e.status === 403 ? "Sem permissão" : "Não autenticado" },
      { status: e.status ?? 401 }
    );
  }

  const limiter = await checkRateLimit({
    request,
    bucket: "admin:sync-typebot-metrics",
    max: 30,
    windowSeconds: 60,
  });
  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(limiter.retryAfterSeconds) },
      }
    );
  }

  let body: { typebot_bot_id?: string; from?: string; to?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const botId = body.typebot_bot_id?.trim();
  if (!botId) {
    return NextResponse.json(
      { error: "typebot_bot_id é obrigatório" },
      { status: 400 }
    );
  }

  try {
    const result = await syncTypebotMetricsForBot({
      typebotBotId: botId,
      from: body.from ? new Date(body.from) : undefined,
      to: body.to ? new Date(body.to) : undefined,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha no sync" },
      { status: 400 }
    );
  }
}
