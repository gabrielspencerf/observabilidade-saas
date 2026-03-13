import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function resolveEncryptionKeyRaw(): string {
  const key =
    process.env.INTEGRATIONS_ENCRYPTION_KEY ??
    process.env.CONFIG_ENCRYPTION_KEY ??
    process.env.GOOGLE_ADS_ENCRYPTION_KEY ??
    "";
  if (!key) {
    throw new Error(
      "Defina INTEGRATIONS_ENCRYPTION_KEY (ou CONFIG_ENCRYPTION_KEY) para criptografar segredos."
    );
  }
  return key;
}

function resolveEncryptionKeyBuffer(): Buffer {
  const raw = resolveEncryptionKeyRaw();
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== KEY_LENGTH) {
    throw new Error(
      "Chave inválida: use 32 bytes (64 hex ou 44 base64)."
    );
  }
  return decoded;
}

export function encryptSecret(plainText: string): string {
  const key = resolveEncryptionKeyBuffer();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(ciphertextBase64: string): string {
  const key = resolveEncryptionKeyBuffer();
  const buf = Buffer.from(ciphertextBase64, "base64");
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Payload criptografado inválido.");
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
