/**
 * Configuração da integração Google Ads: OAuth, criptografia de tokens e state.
 * Credenciais globais da aplicação (client id/secret) separadas de tokens por conta.
 */

import { createHmac, randomBytes, createCipheriv, createDecipheriv } from "crypto";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_ADS_SCOPE = "https://www.googleapis.com/auth/adwords";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEnv(key: string): string {
  const v = process.env[key];
  if (v === undefined || v === "") {
    throw new Error(`Variável de ambiente obrigatória para Google Ads: ${key}`);
  }
  return v;
}

function getEnvOptional(key: string): string | undefined {
  return process.env[key];
}

/** Client ID do OAuth (credencial global da aplicação). */
export function getGoogleAdsClientId(): string {
  return getEnv("GOOGLE_ADS_CLIENT_ID");
}

/** Client Secret do OAuth (credencial global da aplicação). */
export function getGoogleAdsClientSecret(): string {
  return getEnv("GOOGLE_ADS_CLIENT_SECRET");
}

/** URL de redirect após autorização (deve estar registrada no console Google). */
export function getGoogleAdsRedirectUri(): string {
  const explicit = getEnvOptional("GOOGLE_ADS_REDIRECT_URI");
  if (explicit) return explicit;
  const appUrl = getEnvOptional("NEXT_PUBLIC_APP_URL");
  if (!appUrl) {
    throw new Error(
      "Defina GOOGLE_ADS_REDIRECT_URI ou NEXT_PUBLIC_APP_URL para a integração Google Ads"
    );
  }
  return `${appUrl.replace(/\/$/, "")}/api/google-ads/auth/callback`;
}

/** Chave para criptografar refresh_token e access_token (32 bytes em hex ou base64). */
function getEncryptionKeyRaw(): string {
  return getEnv("GOOGLE_ADS_ENCRYPTION_KEY");
}

/** Buffer de 32 bytes para AES-256. Aceita 64 hex chars ou base64. */
function getEncryptionKeyBuffer(): Buffer {
  const raw = getEncryptionKeyRaw();
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      "GOOGLE_ADS_ENCRYPTION_KEY deve ser 32 bytes (64 hex ou 44 base64)"
    );
  }
  return buf;
}

/** Secret para assinar/validar state (evita CSRF). Usa GOOGLE_ADS_STATE_SECRET ou SESSION_SECRET. */
function getStateSecret(): string {
  return (
    getEnvOptional("GOOGLE_ADS_STATE_SECRET") ??
    getEnvOptional("SESSION_SECRET") ??
    ""
  );
}

/** Scope OAuth para Google Ads API. */
export function getGoogleAdsScope(): string {
  return GOOGLE_ADS_SCOPE;
}

/** URL de autorização Google. */
export function getGoogleOAuthAuthUrl(): string {
  return GOOGLE_OAUTH_AUTH_URL;
}

/** URL de troca de code por tokens. */
export function getGoogleOAuthTokenUrl(): string {
  return GOOGLE_OAUTH_TOKEN_URL;
}

/** Validade do state em ms. */
export function getStateTtlMs(): number {
  return STATE_TTL_MS;
}

/**
 * Developer token da MCC (credencial global da aplicação para a Google Ads API).
 * Obrigatório para chamadas à API de relatórios/sync.
 */
export function getGoogleAdsDeveloperToken(): string {
  return getEnv("GOOGLE_ADS_DEVELOPER_TOKEN");
}

/**
 * Login customer ID (MCC) quando as contas cliente são gerenciadas por essa manager.
 * Se definido, enviado como header login-customer-id nas requisições à API.
 * Opcional: não definir quando a conta conectada for standalone.
 */
export function getGoogleAdsLoginCustomerId(): string | undefined {
  const v = getEnvOptional("GOOGLE_ADS_LOGIN_CUSTOMER_ID");
  if (!v || !v.trim()) return undefined;
  return v.trim().replace(/-/g, "");
}

/**
 * Criptografa texto (refresh_token / access_token). Nunca logar resultado.
 * Formato: iv (12) + authTag (16) + ciphertext, em base64.
 */
export function encryptTokens(plaintext: string): string {
  const key = getEncryptionKeyBuffer();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Descriptografa string produzida por encryptTokens.
 */
export function decryptTokens(ciphertextBase64: string): string {
  const key = getEncryptionKeyBuffer();
  const buf = Buffer.from(ciphertextBase64, "base64");
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Payload criptografado inválido");
  }
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

export interface StatePayload {
  tenantId: string;
  nonce: string;
  ts: number;
}

/**
 * Gera state assinado para OAuth (contém tenantId; nunca confiar no frontend).
 */
export function createSignedState(tenantId: string): string {
  const secret = getStateSecret();
  if (!secret) {
    throw new Error(
      "Defina GOOGLE_ADS_STATE_SECRET ou SESSION_SECRET para o fluxo OAuth"
    );
  }
  const payload: StatePayload = {
    tenantId,
    nonce: randomBytes(16).toString("hex"),
    ts: Date.now(),
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, "utf8").toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payloadStr)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

/**
 * Valida state e retorna payload. Retorna null se inválido ou expirado.
 */
export function verifySignedState(state: string): StatePayload | null {
  const secret = getStateSecret();
  if (!secret) return null;
  const dot = state.indexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = state.slice(0, dot);
  const signature = state.slice(dot + 1);
  let payloadStr: string;
  try {
    payloadStr = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expectedSig = createHmac("sha256", secret)
    .update(payloadStr)
    .digest("base64url");
  if (signature !== expectedSig || signature.length === 0) return null;
  let payload: StatePayload;
  try {
    payload = JSON.parse(payloadStr) as StatePayload;
  } catch {
    return null;
  }
  if (
    typeof payload.tenantId !== "string" ||
    typeof payload.nonce !== "string" ||
    typeof payload.ts !== "number"
  ) {
    return null;
  }
  if (Date.now() - payload.ts > getStateTtlMs()) return null;
  return payload;
}
