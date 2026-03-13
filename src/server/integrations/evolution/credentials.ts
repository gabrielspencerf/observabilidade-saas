import { eq } from "drizzle-orm";
import { evolutionInstances } from "@/db/schema";
import { getDb } from "@/server/db";
import { decryptSecret } from "@/server/security/secret-crypto";

export async function getEvolutionInstanceSecret(
  evolutionInstanceId: string
): Promise<string | null> {
  const db = getDb();
  const [instance] = await db
    .select({ apiKeyEncrypted: evolutionInstances.apiKeyEncrypted })
    .from(evolutionInstances)
    .where(eq(evolutionInstances.id, evolutionInstanceId))
    .limit(1);

  if (!instance?.apiKeyEncrypted) return null;
  try {
    return decryptSecret(instance.apiKeyEncrypted);
  } catch {
    // Compatibilidade para dados antigos que ainda estejam em plain text.
    return instance.apiKeyEncrypted;
  }
}
