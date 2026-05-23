import { apiError } from "@/server/http/api-contract";

/**
 * Resposta JSON para falhas de `requireAdmin` em rotas /api/admin/*.
 * Mirror do equivalente dashboard. Retorna envelope `{ ok: false, error }`
 * conforme docs/specs/adr-api-envelope-transition.md.
 */
export function adminApiAuthErrorResponse(err: unknown) {
  const e = err as Error & { status?: number };
  const status = e.status ?? 401;
  if (status === 403) {
    return apiError("forbidden", "Sem permissão", { status: 403 });
  }
  if (status === 400) {
    return apiError("invalid_request", e.message || "Requisição inválida", {
      status: 400,
    });
  }
  return apiError("unauthenticated", "Não autenticado", { status });
}
