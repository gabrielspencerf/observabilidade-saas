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

function parseWorkerDbAccessMode(
  value: string | undefined
): "off" | "bypass" | "tenant" {
  const normalized = (value ?? "off").trim().toLowerCase();
  if (normalized === "bypass" || normalized === "tenant") return normalized;
  return "off";
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

  get isProduction(): boolean {
    return this.nodeEnv === "production";
  },

  /** Habilita aplicação de contexto RLS por request (rollout gradual). */
  get securityEnforceRls(): boolean {
    return getEnvOptional("SECURITY_ENFORCE_RLS") === "true";
  },

  /**
   * Modo de acesso do worker ao banco durante rollout de RLS.
   * - off: sem contexto dedicado (comportamento legado)
   * - bypass: força bypass de RLS para jobs do worker
   * - tenant: aplica tenant quando o job possui tenantId (fallback para bypass em jobs globais)
   */
  get workerDbAccessMode(): "off" | "bypass" | "tenant" {
    return parseWorkerDbAccessMode(getEnvOptional("WORKER_DB_ACCESS_MODE"));
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

  /**
   * App Secret da Meta (WhatsApp Cloud / Marketing API).
   * Obrigatório em produção/staging para validar `X-Hub-Signature-256` nos POST
   * `/api/webhooks/whatsapp-cloud/[numberId]`. Se vazio, o POST aceita sem HMAC (apenas dev local).
   */
  get metaAppSecret(): string | undefined {
    return getEnvOptional("META_APP_SECRET");
  },
} as const;
