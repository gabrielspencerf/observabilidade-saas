export interface DashboardApiError {
  code: string;
  message: string;
}

interface ApiSuccessEnvelope<T> {
  ok: true;
  data: T;
}

interface ApiErrorEnvelope {
  ok: false;
  error: DashboardApiError;
}

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export async function dashboardPostJson<TResponse>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<{ data?: TResponse; error?: DashboardApiError }> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (parsed && typeof parsed === "object" && "ok" in parsed) {
    const envelope = parsed as ApiEnvelope<TResponse>;
    if (envelope.ok) {
      return { data: envelope.data };
    }
    return {
      error: {
        code: envelope.error.code,
        message: envelope.error.message,
      },
    };
  }

  if (!response.ok) {
    return {
      error: {
        code: "request_failed",
        message: "Falha na chamada da API.",
      },
    };
  }

  return {
    data: parsed as TResponse,
  };
}
