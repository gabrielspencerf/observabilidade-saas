/**
 * Configuração de sessão e cookie (auth).
 * Cookie HTTP-only; opções por ambiente (dev vs prod).
 */

const DEFAULT_SESSION_TTL_SECONDS =
  Number(process.env.AUTH_DEFAULT_SESSION_TTL_SECONDS ?? 60 * 60 * 8) || 60 * 60 * 8; // 8h
const REMEMBER_ME_TTL_SECONDS =
  Number(process.env.AUTH_REMEMBER_ME_TTL_SECONDS ?? 60 * 60 * 24 * 30) ||
  60 * 60 * 24 * 30; // 30 dias
const TOKEN_BYTE_LENGTH = 32;

export const authConfig = {
  /** Nome do cookie de sessão (valor de env ou default). */
  get cookieName(): string {
    return process.env.SESSION_COOKIE_NAME ?? "session";
  },

  /** TTL padrão da sessão em segundos. */
  defaultSessionTtlSeconds: DEFAULT_SESSION_TTL_SECONDS,

  /** TTL para "lembrar de mim". */
  rememberMeTtlSeconds: REMEMBER_ME_TTL_SECONDS,

  /** Quantidade de bytes aleatórios para o token opaco (será convertido em hex). */
  tokenByteLength: TOKEN_BYTE_LENGTH,

  /** Opções do cookie para resposta Set-Cookie. */
  get cookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    path: string;
    maxAge: number;
  } {
    const isProd = process.env.NODE_ENV === "production";
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "lax" : "lax",
      path: "/",
      maxAge: DEFAULT_SESSION_TTL_SECONDS,
    };
  },
} as const;
