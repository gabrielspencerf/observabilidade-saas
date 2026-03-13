import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { getObservabilitySnapshot } from "@/server/admin/observability";
import { checkRateLimit } from "@/server/security/rate-limit";

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

  const limiter = await checkRateLimit({
    request,
    bucket: "admin:observability",
    max: 120,
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

  const snapshot = await getObservabilitySnapshot();
  return NextResponse.json(snapshot);
}
