/**
 * Configuração de sessão e cookie (auth).
 * Cookie HTTP-only; opções por ambiente (dev vs prod).
 */

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
const TOKEN_BYTE_LENGTH = 32;

export const authConfig = {
  /** Nome do cookie de sessão (valor de env ou default). */
  get cookieName(): string {
    return process.env.SESSION_COOKIE_NAME ?? "session";
  },

  /** TTL da sessão em segundos (usado em expires_at e maxAge do cookie). */
  sessionTtlSeconds: SESSION_TTL_SECONDS,

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
      maxAge: SESSION_TTL_SECONDS,
    };
  },
} as const;
