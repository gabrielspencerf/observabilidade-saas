/**
 * Adapter envelope-aware para chamadas a /api/admin/* a partir de componentes
 * cliente. Lê tanto o novo formato `{ ok, data | error }` (api-contract) quanto
 * o legado `NextResponse.json({ error })` para suportar a migração incremental
 * descrita em docs/specs/adr-api-envelope-transition.md.
 */

export interface AdminApiError {
  code: string;
  message: string;
}

interface ApiSuccessEnvelope<T> {
  ok: true;
  data: T;
}

interface ApiErrorEnvelope {
  ok: false;
  error: AdminApiError;
}

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

interface AdminFetchResult<T> {
  data?: T;
  error?: AdminApiError;
  status: number;
}

/**
 * Fetch genérico para qualquer método. Resolve envelope `{ ok, data | error }`
 * e mapeia o legado `{ error: "..." }` (string ou objeto) para o mesmo shape
 * `{ data?, error? }`. Nunca lança em erro HTTP — caller decide via `.error`.
 */
export async function adminFetch<T = unknown>(
  input: string,
  init?: RequestInit
): Promise<AdminFetchResult<T>> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    return {
      status: 0,
      error: { code: "network_error", message: "Erro de conexão" },
    };
  }

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (parsed && typeof parsed === "object" && "ok" in parsed) {
    const envelope = parsed as ApiEnvelope<T>;
    if (envelope.ok) {
      return { data: envelope.data, status: response.status };
    }
    return {
      error: {
        code: envelope.error?.code ?? "unknown_error",
        message: envelope.error?.message ?? "Erro desconhecido",
      },
      status: response.status,
    };
  }

  if (!response.ok) {
    const legacyError = (parsed as { error?: unknown } | null)?.error;
    const message =
      typeof legacyError === "string"
        ? legacyError
        : typeof legacyError === "object" && legacyError && "message" in legacyError
          ? String((legacyError as { message: unknown }).message)
          : "Falha na chamada da API.";
    return {
      error: { code: "request_failed", message },
      status: response.status,
    };
  }

  return {
    data: parsed as T,
    status: response.status,
  };
}

export async function adminGet<T = unknown>(url: string) {
  return adminFetch<T>(url, { method: "GET" });
}

export async function adminPost<T = unknown>(url: string, body: Record<string, unknown>) {
  return adminFetch<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function adminPatch<T = unknown>(url: string, body: Record<string, unknown>) {
  return adminFetch<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function adminDelete<T = unknown>(url: string) {
  return adminFetch<T>(url, { method: "DELETE" });
}
