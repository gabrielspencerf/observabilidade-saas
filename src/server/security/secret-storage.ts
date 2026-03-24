import { encryptSecret } from "@/server/security/secret-crypto";
import { env } from "@/config/env";

function isEncryptionConfigError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message || "";
  return (
    message.includes("INTEGRATIONS_ENCRYPTION_KEY") ||
    message.includes("CONFIG_ENCRYPTION_KEY") ||
    message.includes("Chave inválida")
  );
}

/**
 * Em desenvolvimento/teste, permite fallback para plain-text quando a chave de
 * criptografia não está configurada. Em produção, mantém fail-fast por segurança.
 */
export function encryptSecretForStorage(secret: string, source: string): string {
  try {
    return encryptSecret(secret);
  } catch (error) {
    const isConfigError = isEncryptionConfigError(error);
    const canFallback =
      env.nodeEnv === "development" &&
      env.securityAllowPlaintextSecrets &&
      isConfigError;

    if (canFallback) {
      return secret;
    }
    throw error;
  }
}
