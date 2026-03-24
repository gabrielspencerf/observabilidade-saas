/**
 * OAuth Meta Marketing API, criptografia de tokens e state assinado.
 */

import { createHmac, randomBytes, createCipheriv, createDecipheriv } from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEnv(key: string): string {
  const v = process.env[key];
  if (v === undefined || v === "") {
    throw new Error(`Variável de ambiente obrigatória para Meta Ads: ${key}`);
  }
  return v;
}

function getEnvOptional(key: string): string | undefined {
  return process.env[key];
}

export function getMetaAdsAppId(): string {
  return getEnv("META_ADS_APP_ID");
}

export function getMetaAdsAppSecret(): string {
  return getEnv("META_ADS_APP_SECRET");
}

export function getMetaGraphApiVersion(): string {
  const v = getEnvOptional("META_GRAPH_API_VERSION");
  if (v && v.trim()) return v.trim().replace(/^v/i, "v");
  return "v21.0";
}

export function graphApiBaseUrl(): string {
  return `https://graph.facebook.com/${getMetaGraphApiVersion()}`;
}

export function getMetaAdsRedirectUri(): string {
  const explicit = getEnvOptional("META_ADS_REDIRECT_URI");
  if (explicit) return explicit;
  const appUrl = getEnvOptional("NEXT_PUBLIC_APP_URL");
  if (!appUrl) {
    throw new Error(
      "Defina META_ADS_REDIRECT_URI ou NEXT_PUBLIC_APP_URL para a integração Meta Ads"
    );
  }
  return `${appUrl.replace(/\/$/, "")}/api/meta-ads/auth/callback`;
}

/** Scopes mínimos: leitura de contas/insights; anúncios para CAPI com o mesmo token de usuário. */
export function getMetaAdsOAuthScope(): string {
  return "ads_read,ads_management,business_management";
}

function getEncryptionKeyRaw(): string {
  const meta = getEnvOptional("META_ADS_ENCRYPTION_KEY");
  if (meta && meta.trim()) return meta.trim();
  const google = getEnvOptional("GOOGLE_ADS_ENCRYPTION_KEY");
  if (google && google.trim()) return google.trim();
  throw new Error(
    "Defina META_ADS_ENCRYPTION_KEY (ou GOOGLE_ADS_ENCRYPTION_KEY) para criptografar tokens Meta"
  );
}

function getEncryptionKeyBuffer(): Buffer {
  const raw = getEncryptionKeyRaw();
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      "Chave de criptografia Meta deve ter 32 bytes (64 hex ou base64 de 44 chars)"
    );
  }
  return buf;
}

function getStateSecret(): string {
  return (
    getEnvOptional("META_ADS_STATE_SECRET") ??
    getEnvOptional("SESSION_SECRET") ??
    ""
  );
}

export function encryptMetaTokens(plaintext: string): string {
  const key = getEncryptionKeyBuffer();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptMetaTokens(ciphertextBase64: string): string {
  const key = getEncryptionKeyBuffer();
  const buf = Buffer.from(ciphertextBase64, "base64");
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Payload criptografado Meta inválido");
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

export interface MetaStatePayload {
  tenantId: string;
  nonce: string;
  ts: number;
}

export function createMetaSignedState(tenantId: string): string {
  const secret = getStateSecret();
  if (!secret) {
    throw new Error("Defina META_ADS_STATE_SECRET ou SESSION_SECRET para o fluxo OAuth Meta");
  }
  const payload: MetaStatePayload = {
    tenantId,
    nonce: randomBytes(16).toString("hex"),
    ts: Date.now(),
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr, "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(payloadStr).digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifyMetaSignedState(state: string): MetaStatePayload | null {
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
  const expectedSig = createHmac("sha256", secret).update(payloadStr).digest("base64url");
  if (signature !== expectedSig || signature.length === 0) return null;
  let payload: MetaStatePayload;
  try {
    payload = JSON.parse(payloadStr) as MetaStatePayload;
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
  if (Date.now() - payload.ts > STATE_TTL_MS) return null;
  return payload;
}

export function encryptClarityToken(plaintext: string): string {
  return encryptMetaTokens(plaintext);
}

export function decryptClarityToken(ciphertextBase64: string): string {
  return decryptMetaTokens(ciphertextBase64);
}
