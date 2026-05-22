import { enqueueWithDedup } from "@/workers/queue";
import { getSharedRedis } from "@/server/redis";

/**
 * Chave Redis usada pelo dedup. Exportada para uso em testes/smoke que queiram
 * limpar o lock entre cenários consecutivos sem esperar o TTL de 30s.
 *
 * Formato real no Redis: `dedup:enqueue:${classifyDedupKey(...)}`. O prefixo
 * `dedup:enqueue:` é adicionado por `enqueueWithDedup`.
 */
export function classifyDedupKey(tenantId: string, conversationId: string): string {
  return `classify:${tenantId}:${conversationId}`;
}

export function classifyDedupRedisKey(tenantId: string, conversationId: string): string {
  return `dedup:enqueue:${classifyDedupKey(tenantId, conversationId)}`;
}

/**
 * Enfileira classificação de uma conversa, deduplicando por `conversationId` em
 * janela de 30s.
 *
 * Sem dedup, um burst de 10 mensagens em 5s enfileira 10 jobs OpenAI para a
 * mesma conversa — multiplica custo por N. Com 30s de janela, o último estado
 * da conversa é classificado uma vez por janela; mensagens subsequentes ficam
 * fora do dedup mas o resultado é equivalente (classifier vê o estado mais
 * recente da conversa de qualquer forma).
 */
export async function enqueueConversationClassification(input: {
  tenantId: string;
  conversationId: string;
}): Promise<void> {
  if (!process.env.REDIS_URL) return;
  const redis = getSharedRedis();
  try {
    await enqueueWithDedup(
      redis,
      {
        type: "classify_conversation",
        tenantId: input.tenantId,
        conversationId: input.conversationId,
      },
      {
        dedupKey: classifyDedupKey(input.tenantId, input.conversationId),
        dedupTtlSec: 30,
      }
    );
  } catch (error) {
    console.warn(
      "[ai] falha ao enfileirar classificação",
      error instanceof Error ? error.message : error
    );
  }
  // Não fechar a conexão — é o singleton compartilhado.
}
