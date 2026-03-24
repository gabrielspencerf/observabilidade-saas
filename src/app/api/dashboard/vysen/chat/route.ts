import { NextRequest, NextResponse } from "next/server";
import { requireDashboardApiAuth } from "@/server/dashboard/api-auth";
import { dashboardApiAuthErrorResponse } from "@/server/dashboard/api-route-errors";
import { PERMISSION_SLUGS } from "@/server/rbac";
import { askVysenCopilot } from "@/server/vysen/copilot";

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireDashboardApiAuth(request, PERMISSION_SLUGS.DASHBOARD_READ);
  } catch (err) {
    return dashboardApiAuthErrorResponse(err);
  }

  const tenantId = session.session.currentTenantId!;

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
  const contextArea =
    typeof body.contextArea === "string" && body.contextArea.trim()
      ? body.contextArea.trim()
      : "geral";
  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (item): item is { role: "user" | "assistant"; content: string } =>
            Boolean(
              item &&
                typeof item === "object" &&
                (item as { role?: unknown }).role &&
                ((item as { role?: unknown }).role === "user" ||
                  (item as { role?: unknown }).role === "assistant") &&
                typeof (item as { content?: unknown }).content === "string"
            )
        )
        .slice(-12)
    : [];

  try {
    const result = await askVysenCopilot({
      question,
      tenantId,
      userId: session.user.id,
      channel: "dashboard",
      contextArea,
      history,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao consultar a Vysen neste momento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

