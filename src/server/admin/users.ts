/**
 * CRUD de usuários (admin global). Não faz checagem de permissão — chamador deve usar requireAdmin.
 */
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { users } from "@/db/schema";

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string | null;
  email: string;
  password: string;
  isActive: boolean;
}

export async function listUsers(): Promise<UserRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(users.email);
  return rows;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row ?? null;
}

const MIN_PASSWORD_LENGTH = 8;

export async function createUser(
  input: CreateUserInput
): Promise<{ id: string } | { error: string }> {
  const db = getDb();
  const email = (input.email ?? "").trim().toLowerCase();
  const name = input.name?.trim() || null;
  const password = input.password ?? "";
  const isActive = input.isActive ?? true;

  if (!email) return { error: "E-mail é obrigatório" };
  if (email.length > 255) return { error: "E-mail muito longo" };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres` };
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  try {
    const [inserted] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        name,
        isActive,
      })
      .returning({ id: users.id });
    if (!inserted) return { error: "Falha ao criar usuário" };
    return { id: inserted.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return { error: "Já existe um usuário com este e-mail" };
    }
    return { error: "Erro ao criar usuário" };
  }
}
