import { enqueue } from "@/workers/queue";
import { createRedisClient } from "@/server/redis";

export async function enqueueConversationClassification(input: {
  tenantId: string;
  conversationId: string;
}): Promise<void> {
  if (!process.env.REDIS_URL) return;
  const redis = createRedisClient();
  try {
    await enqueue(redis, {
      type: "classify_conversation",
      tenantId: input.tenantId,
      conversationId: input.conversationId,
    });
  } catch (error) {
    console.warn(
      "[ai] falha ao enfileirar classificação",
      error instanceof Error ? error.message : error
    );
  } finally {
    await redis.quit().catch(() => {});
  }
}
