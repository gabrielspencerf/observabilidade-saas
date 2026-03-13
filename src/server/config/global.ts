/**
 * Configuração global editável pela web (banco).
 * Valores sensíveis criptografados com CONFIG_ENCRYPTION_KEY (AES-256-GCM).
 * Nunca logar valores em claro; fallback para env em camadas superiores quando desejado.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/server/db";
import { appGlobalConfig } from "@/db/schema";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

const CONFIG_ENCRYPTION_KEY_ENV = "CONFIG_ENCRYPTION_KEY";

function getConfigEncryptionKeyRaw(): string | undefined {
  const v = process.env[CONFIG_ENCRYPTION_KEY_ENV];
  if (v === undefined || v === "") return undefined;
  return v;
}

function getConfigEncryptionKeyBuffer(): Buffer {
  const raw = getConfigEncryptionKeyRaw();
  if (!raw) {
    throw new Error(
      `${CONFIG_ENCRYPTION_KEY_ENV} é obrigatória para ler/gravar valores sensíveis da config global`
    );
  }
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `${CONFIG_ENCRYPTION_KEY_ENV} deve ser 32 bytes (64 hex ou 44 base64)`
    );
  }
  return buf;
}

/**
 * Criptografa valor para armazenamento em value_encrypted.
 * Formato: iv (12) + authTag (16) + ciphertext, base64.
 */
function encryptConfigValue(plaintext: string): string {
  const key = getConfigEncryptionKeyBuffer();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Descriptografa valor de value_encrypted.
 */
function decryptConfigValue(ciphertextBase64: string): string {
  const key = getConfigEncryptionKeyBuffer();
  const buf = Buffer.from(ciphertextBase64, "base64");
  if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Payload criptografado da config global inválido");
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

export interface SetGlobalConfigOptions {
  /** Se true, valor é criptografado e armazenado em value_encrypted. */
  sensitive?: boolean;
  /** User id que está alterando (auditoria). */
  updatedBy?: string | null;
}

/**
 * Retorna o valor da chave (descriptografado se sensível). Nunca loga o valor.
 * Retorna null se a chave não existir.
 */
export async function getGlobalConfig(key: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({
      valuePlain: appGlobalConfig.valuePlain,
      valueEncrypted: appGlobalConfig.valueEncrypted,
      isSensitive: appGlobalConfig.isSensitive,
    })
    .from(appGlobalConfig)
    .where(eq(appGlobalConfig.key, key))
    .limit(1);

  if (!row) return null;

  if (row.valueEncrypted) {
    return decryptConfigValue(row.valueEncrypted);
  }
  return row.valuePlain ?? null;
}

/**
 * Define ou atualiza uma chave. Para valores sensíveis, usa criptografia e value_encrypted.
 * Nunca loga o valor.
 */
export async function setGlobalConfig(
  key: string,
  value: string,
  options: SetGlobalConfigOptions = {}
): Promise<void> {
  const db = getDb();
  const { sensitive = false, updatedBy = null } = options;

  if (key.length > 128) {
    throw new Error("Config key deve ter no máximo 128 caracteres");
  }

  const valuePlain = sensitive ? null : value;
  const valueEncrypted = sensitive ? encryptConfigValue(value) : null;

  await db
    .insert(appGlobalConfig)
    .values({
      key,
      valuePlain,
      valueEncrypted,
      isSensitive: sensitive,
      updatedBy,
    })
    .onConflictDoUpdate({
      target: appGlobalConfig.key,
      set: {
        valuePlain,
        valueEncrypted,
        isSensitive: sensitive,
        updatedAt: new Date(),
        updatedBy,
      },
    });
}

/**
 * Retorna múltiplas chaves de uma vez. Chaves ausentes não entram no resultado.
 * Valores sensíveis são descriptografados; nunca logados.
 */
export async function getMultipleGlobalConfig(
  keys: string[]
): Promise<Record<string, string | null>> {
  if (keys.length === 0) return {};

  const db = getDb();
  const rows = await db
    .select({
      key: appGlobalConfig.key,
      valuePlain: appGlobalConfig.valuePlain,
      valueEncrypted: appGlobalConfig.valueEncrypted,
    })
    .from(appGlobalConfig)
    .where(inArray(appGlobalConfig.key, keys));

  const result: Record<string, string | null> = {};
  for (const row of rows) {
    if (row.valueEncrypted) {
      result[row.key] = decryptConfigValue(row.valueEncrypted);
    } else {
      result[row.key] = row.valuePlain ?? null;
    }
  }
  return result;
}

/**
 * Retorna valor da config global ou, se ausente, a variável de ambiente.
 * Ordem: 1) banco, 2) env. Use para integrações que podem ser configuradas pelo setup ou por .env.
 */
export async function getGlobalConfigOrEnv(
  configKey: string,
  envKey: string
): Promise<string | null> {
  const fromDb = await getGlobalConfig(configKey);
  if (fromDb !== null && fromDb !== "") return fromDb;
  const fromEnv = process.env[envKey];
  if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
  return null;
}
