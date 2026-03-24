import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { getVysenAdminInsights } from "@/server/vysen/orchestrator";

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

  const periodDaysRaw = request.nextUrl.searchParams.get("periodDays");
  const periodDays = Number(periodDaysRaw ?? 30);
  const safePeriod = Number.isFinite(periodDays)
    ? Math.max(7, Math.min(120, Math.floor(periodDays)))
    : 30;
  const insights = await getVysenAdminInsights(safePeriod);
  return NextResponse.json(insights);
}

