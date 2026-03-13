/**
 * Token opaco para sessão: geração e hash.
 * O valor em claro só existe no cookie; no banco apenas token_hash.
 */
import { createHash, randomBytes } from "node:crypto";
import { authConfig } from "./config";

const HASH_ALGORITHM = "sha256";
const HASH_ENCODING = "hex" as const;

export function generateOpaqueToken(): string {
  return randomBytes(authConfig.tokenByteLength).toString("hex");
}

/**
 * Hash do token para armazenar no banco (nunca armazenar o token em claro).
 */
export function hashToken(token: string): string {
  return createHash(HASH_ALGORITHM).update(token, "utf8").digest(HASH_ENCODING);
}
