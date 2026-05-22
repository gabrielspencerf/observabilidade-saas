import { apiError } from "@/server/http/api-contract";

/** Resposta JSON para falhas de `requireAuth` / `requireDashboardApiAuth` / `requirePermission`. */
export function dashboardApiAuthErrorResponse(err: unknown) {
  const e = err as Error & { status?: number };
  const status = e.status ?? 401;
  let message = "Não autenticado";
  let code = "unauthenticated";
  if (status === 403) message = "Sem permissão";
  if (status === 403) code = "forbidden";
  else if (status === 400) {
    message = e.message || "Requisição inválida";
    code = "invalid_request";
  }
  return apiError(code, message, { status });
}
