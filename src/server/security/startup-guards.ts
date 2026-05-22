import { env } from "@/config/env";

/** Flags inseguras: seguro rodar em `next build` / instrumentation. */
export function assertProductionPlaintextSecretsDisabled(): void {
  if (!env.isProduction) {
    return;
  }
  if (env.securityAllowPlaintextSecrets) {
    throw new Error(
      "SECURITY_ALLOW_PLAINTEXT_SECRETS não pode ser true em produção (NODE_ENV=production)."
    );
  }
}

/**
 * Baseline mínimo obrigatório em produção para evitar drift de segurança entre ambientes.
 * Mantém dev/test flexível, mas fecha configuração insegura em runtime real.
 */
export function assertProductionSecurityBaseline(): void {
  if (!env.isProduction) {
    return;
  }
  assertProductionPlaintextSecretsDisabled();

  if (!env.securityEnforceRls) {
    throw new Error(
      "SECURITY_ENFORCE_RLS deve ser true em produção para garantir isolamento por tenant."
    );
  }

  if (!env.securityEnforceCsrf) {
    throw new Error(
      "SECURITY_ENFORCE_CSRF deve ser true em produção para proteger mutações autenticadas por cookie."
    );
  }
}

/**
 * Segredos exigidos para tráfego real (worker / processos long-running).
 * Não chamar durante `next build` se o CI não injetar META_APP_SECRET.
 */
export function assertProductionRuntimeWebhookSecrets(): void {
  if (!env.isProduction) {
    return;
  }
  assertProductionSecurityBaseline();
  const meta = env.metaAppSecret?.trim() ?? "";
  if (!meta) {
    throw new Error(
      "META_APP_SECRET é obrigatório em produção para validar webhooks WhatsApp Cloud (HMAC)."
    );
  }
}

/** @deprecated Prefer assertProductionPlaintextSecretsDisabled ou assertProductionRuntimeWebhookSecrets */
export function assertProductionSecurityEnv(): void {
  assertProductionSecurityBaseline();
}
