/**
 * Sanitização de redirects em rotas server com política alinhada a SECURITY_STRICT_REDIRECTS.
 */
import { env } from "@/config/env";
import { sanitizeInternalRedirect } from "@/lib/security/redirect";

export function sanitizeOAuthRedirect(
  candidate: string | null | undefined,
  fallback: string,
  allowedPrefixes: string[]
): string {
  return sanitizeInternalRedirect(candidate, fallback, allowedPrefixes, {
    relaxed: !env.securityStrictRedirects,
  });
}
