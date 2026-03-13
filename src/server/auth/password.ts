/**
 * Verificação de senha com argon2 (hash gerado no seed e em futuros registros).
 */
import argon2 from "argon2";

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, plainPassword);
}
