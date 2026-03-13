/**
 * Helper para construir Request a partir de headers (ex.: cookie de sessão).
 * Usado em layouts e server components que precisam chamar getCurrentSession(request).
 */
export function requestFromHeaders(headersList: Headers): Request {
  const cookie = headersList.get("cookie") ?? "";
  return new Request("http://localhost", {
    headers: cookie ? { cookie } : {},
  });
}
