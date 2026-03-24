import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { getVysenAdminInsights } from "@/server/vysen/orchestrator";
import { getKnowledgeHealth } from "@/server/vysen/knowledge";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: e.status === 403 ? "Sem permissão" : "Não autenticado" },
      { status: e.status ?? 401 }
    );
  }

  const [insights, knowledge] = await Promise.all([
    getVysenAdminInsights(30).catch(() => null),
    getKnowledgeHealth().catch(() => []),
  ]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    insightsHealth: insights?.health ?? null,
    knowledge,
  });
}

