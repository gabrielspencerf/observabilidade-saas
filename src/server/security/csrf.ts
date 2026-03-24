import { randomBytes, timingSafeEqual } from "crypto";
import { env } from "@/config/env";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

function getCookieFromHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function getCsrfCookieName(): string {
  return CSRF_COOKIE_NAME;
}

export function buildSetCsrfCookieHeader(token: string): string {
  const secure = env.nodeEnv === "production";
  const parts = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=/`,
    `SameSite=Lax`,
    secure ? "Secure" : "",
    // Cookie legível no browser para envio em header custom.
    "Max-Age=2592000",
  ].filter(Boolean);
  return parts.join("; ");
}

export function buildClearCsrfCookieHeader(): string {
  return `${CSRF_COOKIE_NAME}=; Path=/; SameSite=Lax; Max-Age=0`;
}

export function shouldRequireCsrf(request: Request | null): boolean {
  if (!request || !env.securityEnforceCsrf) return false;
  const method = request.method.toUpperCase();
  return method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
}

/**
 * Valida CSRF: header `x-csrf-token` igual ao cookie, ou (mutações com body de formulário)
 * campo `csrf_token` no FormData igual ao cookie. Usa clone do body para não consumir o stream original.
 */
export async function validateCsrfRequest(
  request: Request | null
): Promise<{ ok: true } | { ok: false }> {
  if (!request) return { ok: false };
  const cookieToken = getCookieFromHeader(request.headers.get("cookie"), CSRF_COOKIE_NAME);
  if (!cookieToken) return { ok: false };

  const headerToken = request.headers.get(CSRF_HEADER_NAME)?.trim() ?? "";
  if (headerToken && safeEqual(cookieToken, headerToken)) {
    return { ok: true };
  }

  const method = request.method.toUpperCase();
  if (method !== "POST" && method !== "PUT" && method !== "PATCH" && method !== "DELETE") {
    return { ok: false };
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (
    !contentType.includes("multipart/form-data") &&
    !contentType.includes("application/x-www-form-urlencoded")
  ) {
    return { ok: false };
  }

  try {
    const cloned = request.clone();
    const formData = await cloned.formData();
    const bodyToken = formData.get("csrf_token")?.toString().trim() ?? "";
    if (bodyToken && safeEqual(cookieToken, bodyToken)) {
      return { ok: true };
    }
  } catch {
    return { ok: false };
  }
  return { ok: false };
}
