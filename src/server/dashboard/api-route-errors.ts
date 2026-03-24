import { NextResponse } from "next/server";

/** Resposta JSON para falhas de `requireAuth` / `requireDashboardApiAuth` / `requirePermission`. */
export function dashboardApiAuthErrorResponse(err: unknown) {
  const e = err as Error & { status?: number };
  const status = e.status ?? 401;
  let message = "Não autenticado";
  if (status === 403) message = "Sem permissão";
  else if (status === 400) message = e.message || "Requisição inválida";
  return NextResponse.json({ error: message }, { status });
}
