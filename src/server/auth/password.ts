/**
 * Verificação de senha com argon2 (hash gerado no seed e em futuros registros).
 */
import argon2 from "argon2";

export async function hashPassword(plainPassword: string): Promise<string> {
  return argon2.hash(plainPassword, { type: argon2.argon2id });
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, plainPassword);
}
