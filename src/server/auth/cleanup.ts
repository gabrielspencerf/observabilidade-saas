import { lt } from "drizzle-orm";
import { getDb } from "@/server/db";
import { passwordResetTokens, sessions } from "@/db/schema";

export async function cleanupExpiredAuthArtifacts(): Promise<{
  sessionsDeleted: number;
  passwordResetTokensDeleted: number;
}> {
  const db = getDb();
  const now = new Date();

  const deletedSessions = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });

  const deletedResetTokens = await db
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, now))
    .returning({ id: passwordResetTokens.id });

  return {
    sessionsDeleted: deletedSessions.length,
    passwordResetTokensDeleted: deletedResetTokens.length,
  };
}
