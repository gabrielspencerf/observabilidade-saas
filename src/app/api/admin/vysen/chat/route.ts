import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { askVysenCopilot } from "@/server/vysen/copilot";

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin(request);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: e.status === 403 ? "Sem permissão" : "Não autenticado" },
      { status: e.status ?? 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question : "";
  if (!question.trim()) {
    return NextResponse.json({ error: "Pergunta é obrigatória." }, { status: 400 });
  }
  const tenantId = typeof body.tenantId === "string" ? body.tenantId : null;

  try {
    const result = await askVysenCopilot({
      question,
      tenantId,
      userId: session.user.id,
      channel: "admin",
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao consultar a Vysen neste momento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

