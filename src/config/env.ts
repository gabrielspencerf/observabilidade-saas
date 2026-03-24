/**
 * Validação e leitura de variáveis de ambiente (server-only onde fizer sentido).
 * Base 1: variáveis obrigatórias para app e worker.
 */

function getEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  }
  return value;
}

function getEnvOptional(key: string): string | undefined {
  return process.env[key];
}

export const env = {
  get databaseUrl(): string {
    return getEnv("DATABASE_URL");
  },

  get redisUrl(): string {
    return getEnv("REDIS_URL");
  },

  get sessionCookieName(): string {
    return getEnvOptional("SESSION_COOKIE_NAME") ?? "session";
  },

  get sessionSecret(): string {
    return getEnv("SESSION_SECRET");
  },

  get nodeEnv(): string {
    return getEnvOptional("NODE_ENV") ?? "development";
  },

  get appUrl(): string | undefined {
    return getEnvOptional("NEXT_PUBLIC_APP_URL");
  },

  get isDev(): boolean {
    return this.nodeEnv === "development";
  },

  /** Habilita aplicação de contexto RLS por request (rollout gradual). */
  get securityEnforceRls(): boolean {
    return getEnvOptional("SECURITY_ENFORCE_RLS") === "true";
  },

  /** Habilita validação CSRF por token em mutações autenticadas por cookie. */
  get securityEnforceCsrf(): boolean {
    return getEnvOptional("SECURITY_ENFORCE_CSRF") === "true";
  },

  /** Whitelist de prefixos em redirects server (OAuth). Default: estrito se a variável estiver omitida. */
  get securityStrictRedirects(): boolean {
    const v = getEnvOptional("SECURITY_STRICT_REDIRECTS");
    if (v === undefined || v === "") return true;
    return v === "true";
  },

  /** Permite fallback de segredo em plaintext apenas quando explicitamente ligado. */
  get securityAllowPlaintextSecrets(): boolean {
    return getEnvOptional("SECURITY_ALLOW_PLAINTEXT_SECRETS") === "true";
  },

  /** Número de proxies confiáveis para interpretar X-Forwarded-For (0 desabilita). */
  get rateLimitTrustedProxyHops(): number {
    const value = Number(getEnvOptional("RATE_LIMIT_TRUSTED_PROXY_HOPS") ?? "0");
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
  },

  /** Autenticação por conta (Google Ads): quando true, o botão "Conectar nova conta" fica ativo. */
  get googleAdsConnectEnabled(): boolean {
    return getEnvOptional("GOOGLE_ADS_CONNECT_ENABLED") === "true";
  },

  /** OAuth Meta Marketing API + CAPI: habilita fluxo de conexão no dashboard. */
  get metaAdsConnectEnabled(): boolean {
    return getEnvOptional("META_ADS_CONNECT_ENABLED") === "true";
  },

  /** Clarity Data Export: permite cadastrar token e sincronizar insights no dashboard. */
  get clarityConnectEnabled(): boolean {
    return getEnvOptional("CLARITY_CONNECT_ENABLED") === "true";
  },
} as const;
