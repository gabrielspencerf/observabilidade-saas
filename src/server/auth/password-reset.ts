import { and, eq, gt, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb } from "@/server/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword } from "@/server/auth/password";
import { hashToken } from "@/server/auth/token";
import { sendEmail } from "@/server/notifications/mailer";
import { invalidateAllSessionsForUser } from "@/server/auth/session";

const RESET_TTL_MINUTES = Number(process.env.AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30) || 30;

function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : "http://localhost:3000";
}

function buildResetLink(token: string): string {
  return `${getAppUrl().replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
}

function buildPasswordSetupLink(token: string): string {
  return `${getAppUrl().replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}&mode=setup`;
}

function createResetTokenRaw(): string {
  return randomBytes(32).toString("hex");
}

export async function createPasswordResetTokenForUser(userId: string): Promise<string> {
  const db = getDb();
  const rawToken = createResetTokenRaw();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

export async function requestPasswordResetByEmail(email: string): Promise<{ ok: true }> {
  const db = getDb();
  const normalized = email.trim().toLowerCase();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  // Resposta neutra (nao revelar existencia do usuario)
  if (!user || !user.isActive) return { ok: true };

  const token = await createPasswordResetTokenForUser(user.id);
  const link = buildResetLink(token);
  const hello = user.name?.trim() || user.email;
  const subject = "Redefinição de senha — Creative Lane";
  const html = `
    <p>Olá, ${hello}.</p>
    <p>Recebemos um pedido para redefinir sua senha.</p>
    <p><a href="${link}">Clique aqui para redefinir sua senha</a></p>
    <p>Este link expira em ${RESET_TTL_MINUTES} minutos.</p>
    <p>Se você não solicitou, ignore este e-mail.</p>
  `;
  await sendEmail({
    to: user.email,
    subject,
    html,
    text: `Use este link para redefinir sua senha: ${link}`,
  });
  return { ok: true };
}

export async function sendInitialAccessEmail(input: {
  userId: string;
  email: string;
  name: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const token = await createPasswordResetTokenForUser(input.userId);
  const link = buildPasswordSetupLink(token);
  const subject = "Acesso criado — defina sua senha";
  const hello = input.name?.trim() || input.email;

  return sendEmail({
    to: input.email,
    subject,
    html: `
      <p>Olá, ${hello}.</p>
      <p>Sua conta foi criada na plataforma Creative Lane.</p>
      <p><a href="${link}">Clique aqui para definir sua senha de acesso</a></p>
      <p>Este link expira em ${RESET_TTL_MINUTES} minutos.</p>
    `,
    text: `Sua conta foi criada. Defina sua senha neste link: ${link}`,
  });
}

export async function resetPasswordByToken(input: {
  token: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  const token = input.token.trim();
  if (!token) return { ok: false, error: "Token inválido." };
  if (input.newPassword.length < 8) {
    return { ok: false, error: "Senha deve ter no mínimo 8 caracteres." };
  }

  const tokenHash = hashToken(token);
  const now = new Date();
  const [row] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
    })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!row) {
    return { ok: false, error: "Token expirado ou inválido." };
  }

  const passwordHash = await hashPassword(input.newPassword);
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, row.userId));

    await tx
      .update(passwordResetTokens)
      .set({
        usedAt: new Date(),
      })
      .where(eq(passwordResetTokens.id, row.id));
  });
  await invalidateAllSessionsForUser(row.userId);

  return { ok: true };
}
