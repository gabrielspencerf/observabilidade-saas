import { NextResponse } from "next/server";

export const API_CONTRACT_VERSION = "2026-04-26";
export const WEBHOOK_CONTRACT_VERSION = "2026-04-26";

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiFailure {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export function apiOk<T>(
  data: T,
  init?: { status?: number; headers?: Record<string, string> }
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    { ok: true, data },
    {
      status: init?.status ?? 200,
      headers: {
        "x-api-version": API_CONTRACT_VERSION,
        ...(init?.headers ?? {}),
      },
    }
  );
}

export function apiError(
  code: string,
  message: string,
  init?: { status?: number; headers?: Record<string, string> }
): NextResponse<ApiFailure> {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message },
    },
    {
      status: init?.status ?? 400,
      headers: {
        "x-api-version": API_CONTRACT_VERSION,
        ...(init?.headers ?? {}),
      },
    }
  );
}

export function webhookResponseHeaders(input: {
  eventId?: string | null;
  replayWindowSeconds: number;
}): Record<string, string> {
  return {
    "x-webhook-contract-version": WEBHOOK_CONTRACT_VERSION,
    "x-webhook-replay-window-seconds": String(input.replayWindowSeconds),
    ...(input.eventId ? { "x-webhook-idempotency-key": input.eventId } : {}),
  };
}
