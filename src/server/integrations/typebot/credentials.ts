import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { typebotBots } from "@/db/schema";
import { decryptSecret } from "@/server/security/secret-crypto";

export interface TypebotBotCredentials {
  webhookSecret: string | null;
  apiToken: string | null;
  metricsApiBaseUrl: string | null;
}

function maybeDecryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return decryptSecret(value);
  } catch {
    return value;
  }
}

export async function getTypebotBotCredentials(
  typebotBotId: string
): Promise<TypebotBotCredentials | null> {
  const db = getDb();
  const [bot] = await db
    .select({
      webhookSecretEncrypted: typebotBots.webhookSecretEncrypted,
      apiTokenEncrypted: typebotBots.apiTokenEncrypted,
      metricsApiBaseUrl: typebotBots.metricsApiBaseUrl,
    })
    .from(typebotBots)
    .where(eq(typebotBots.id, typebotBotId))
    .limit(1);

  if (!bot) return null;
  return {
    webhookSecret: maybeDecryptSecret(bot.webhookSecretEncrypted),
    apiToken: maybeDecryptSecret(bot.apiTokenEncrypted),
    metricsApiBaseUrl: bot.metricsApiBaseUrl?.trim() || null,
  };
}
