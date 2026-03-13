import { createHmac, timingSafeEqual } from "crypto";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function normalizeHex(input: string): string {
  return input.trim().toLowerCase();
}

function safeEqualsHex(expectedHex: string, providedHex: string): boolean {
  const expected = Buffer.from(normalizeHex(expectedHex), "hex");
  const provided = Buffer.from(normalizeHex(providedHex), "hex");
  if (expected.length === 0 || provided.length === 0) return false;
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function createWebhookSignature(
  timestamp: string,
  rawBody: string,
  secret: string
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
}

export function verifyWebhookSignature(args: {
  timestampHeader: string | null;
  signatureHeader: string | null;
  rawBody: string;
  secret: string;
  nowMs?: number;
}): { ok: true } | { ok: false; error: string; status: number } {
  const timestamp = args.timestampHeader?.trim() ?? "";
  const signature = args.signatureHeader?.trim() ?? "";

  if (!timestamp || !signature) {
    return {
      ok: false,
      error: "Webhook signature headers ausentes",
      status: 401,
    };
  }

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs)) {
    return { ok: false, error: "Timestamp inválido", status: 401 };
  }

  const now = args.nowMs ?? Date.now();
  const skew = Math.abs(now - timestampMs);
  if (skew > MAX_CLOCK_SKEW_MS) {
    return { ok: false, error: "Timestamp fora da janela", status: 401 };
  }

  const expected = createWebhookSignature(timestamp, args.rawBody, args.secret);
  if (!safeEqualsHex(expected, signature)) {
    return { ok: false, error: "Assinatura inválida", status: 403 };
  }

  return { ok: true };
}
