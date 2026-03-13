# Base 2 — Etapa 2: Pipeline Evolution (webhook → raw → queue → processamento → normalizado)

> Atualização: o fluxo atual adiciona assinatura HMAC com timestamp (compatível com `X-API-Key` legado), rate-limit de webhook, deduplicação forte por índice parcial e retry/backoff com DLQ no worker.

## 1. Objetivo

Fechar o fluxo mínimo funcional da Evolution de ponta a ponta:

`webhook → raw event → queue → worker → conversations / conversation_messages → processed_at | processing_error`

Sem dashboard analítica, sem IA, sem Google Ads. Foco no menor conjunto útil para validar o pipeline.

---

## 2. Arquivos alterados/criados e responsabilidades

### server/integrations/evolution/validate.ts (alterado)

| Responsabilidade |
|------------------|
| `validateEvolutionWebhook(request, instanceIdOrToken)`. Resolve instância por `evolution_instances.id` (UUID). Retorna `{ tenantId, evolutionInstanceId }` ou `{ error, status }` (400, 404). Identificador na URL = UUID interno da instância. |

### server/integrations/evolution/parse.ts (alterado)

| Responsabilidade |
|------------------|
| `parseEvolutionWebhookBody(body)`. Extrai `eventType` de `body.event`; `externalEventId` de `body.data.key.id` (id da mensagem) ou `body.id` quando existir. Retorna `{ eventType, payload, externalEventId }` ou `{ error }`. |

### server/integrations/evolution/ingest.ts (alterado)

| Responsabilidade |
|------------------|
| Persistir em `evolution_webhook_events` (tenant_id, evolution_instance_id, event_type, payload, received_at, external_event_id). Deduplicação: se `external_event_id` informado e já existir registro com mesmo (tenant_id, evolution_instance_id, external_event_id), retorna o id existente **sem** inserir nem enfileirar. Caso contrário insere, faz `enqueue(redis, job)` com job `process_evolution_raw` (rawEventId, tenantId, evolutionInstanceId) e retorna rawEventId. Usa `createRedisClient()`, enfileira e faz `redis.quit()`. |

### workers/runner.ts (alterado)

| Responsabilidade |
|------------------|
| Além do heartbeat e do consumidor da fila Typebot, inicia consumidor da fila `queue:raw:evolution`: loop com `dequeue(redis, QUEUE_RAW_EVOLUTION, 5)`, chama `processEvolutionRaw(job)`, loga `[evolution] processed { rawEventId }` em sucesso e `[evolution] processing failed { rawEventId, error }` em falha. |

### workers/processors/evolution.ts (alterado)

| Responsabilidade |
|------------------|
| `processEvolutionRaw(job)`. Carrega raw event por id; se já `processed_at` preenchido, retorna ok (idempotente). Suporta apenas event types que geram mensagem (ver seção 5). Para `messages.upsert` / `MESSAGES_UPSERT`: extrai remoteJid, fromMe, messageId, texto e messageTimestamp do payload; upsert de conversation por (tenant_id, evolution_instance_id, external_id=remoteJid); atualiza last_synced_at; insere conversation_message apenas se não existir (conversation_id, external_id=messageId); direction = fromMe ? 'out' : 'in'; contentType = 'text'; contentText e payload preenchidos. Marca raw event com processed_at; em exceção grava processing_error (até 1024 chars) e processed_at. |

### app/api/webhooks/evolution/[instanceId]/route.ts (alterado)

| Responsabilidade |
|------------------|
| Removido branch 501 "Webhook ingestion not implemented yet"; ingest agora implementado. |

---

## 3. Fluxo completo

1. **Evolution** envia POST para `/api/webhooks/evolution/[instanceId]` com body JSON (instanceId = UUID de `evolution_instances.id`).
2. **Rota:** Valida Content-Type e tamanho (máx. 512 KB); chama `validateEvolutionWebhook(request, instanceId)` → instance por id; `parseEvolutionWebhookBody(body)` → eventType, payload, externalEventId; `ingestEvolutionWebhook(...)`.
3. **Ingest:** Se external_event_id presente e já existir raw com (tenant_id, evolution_instance_id, external_event_id), retorna esse id sem inserir nem enfileirar. Senão: INSERT em `evolution_webhook_events`, LPUSH em `queue:raw:evolution` com job `{ type: "process_evolution_raw", rawEventId, tenantId, evolutionInstanceId }`, retorna rawEventId.
4. **Rota** responde 200 `{ received: true, id: rawEventId }`.
5. **Worker** faz BRPOP em `queue:raw:evolution` (timeout 5s); ao receber job chama `processEvolutionRaw(job)`.
6. **Processor:** SELECT raw event; se processed_at já preenchido → return ok. Se event_type não for suportado → marca processed_at e return ok (ignora). Para messages.upsert: parseia data.key (remoteJid, fromMe, id) e data.message (conversation / extendedTextMessage.text), messageTimestamp; busca/insere conversation por (tenant_id, evolution_instance_id, external_id=remoteJid); atualiza last_synced_at; se não existir mensagem com (conversation_id, external_id=messageId), INSERT conversation_message. UPDATE raw event SET processed_at. Em erro: UPDATE raw event SET processing_error e processed_at.

---

## 4. Decisões de idempotência

| Camada | Chave / critério | Comportamento |
|--------|------------------|---------------|
| **Ingest (raw event)** | (tenant_id, evolution_instance_id, external_event_id) quando external_event_id presente | Se já existir linha com esses três, não insere nem enfileira; retorna 200 com id existente. |
| **Ingest (sem external_event_id)** | Nenhuma | Sempre insere e enfileira. Possível duplicata de raw se o provedor reenviar; mitigação no processamento. |
| **Conversation** | (tenant_id, evolution_instance_id, external_id) com external_id = remoteJid | Upsert: SELECT por essa chave; se existe atualiza last_synced_at; senão INSERT. startedAt na criação = sentAt da primeira mensagem; status = 'open'. |
| **Conversation message** | (conversation_id, external_id) com external_id = messageId (data.key.id) | Antes de inserir, verifica se já existe mensagem com esse conversation_id e external_id; se sim não insere (evita duplicar ao reprocessar o mesmo raw). |
| **Raw event (processamento)** | processed_at preenchido | No início do processor, se processed_at já estiver setado, retorna ok sem reprocessar. |

---

## 5. Event types suportados nesta primeira versão

- **messages.upsert** (e alias **MESSAGES_UPSERT**): notifica quando uma mensagem é recebida ou enviada. Payload esperado: `data.key` com `remoteJid`, `fromMe`, `id`; `data.message` com `conversation` ou `extendedTextMessage.text`; `data.messageTimestamp` (Unix segundos).

Demais eventos (MESSAGES_UPDATE, MESSAGES_DELETE, SEND_MESSAGE, CHATS_*, CONNECTION_UPDATE, etc.) são **ignorados** nesta versão: o raw event é marcado com processed_at e o job retorna ok, sem erro. Não inserimos conversa nem mensagem para eles.

---

## 6. Limitações assumidas nesta primeira versão

- **Identificação da instância:** Apenas por `evolution_instances.id` (UUID) na URL. Não há validação de API key no header (opcional para uma fase posterior).
- **Payload Evolution:** Assume estrutura mínima de messages.upsert (data.key, data.message, data.messageTimestamp). Outros formatos ou versões da API podem exigir ajuste no parse.
- **Conversation:** lead_id sempre null; status sempre 'open'; sem fechamento automático de conversa.
- **Mensagem:** Apenas texto (conversation / extendedTextMessage). Mídia (imagem, áudio, etc.) não é extraída como content_type específico; payload bruto fica em conversation_messages.payload.
- **Reprocessamento:** Idempotente: conversation por (tenant, instance, remoteJid); message por (conversation_id, messageId); raw já com processed_at é ignorado.
- **Observabilidade:** Apenas logs no worker (sucesso/falha por rawEventId); sem métricas nem tracing.

---

## 7. Resumo

- **Webhook** identifica instância por UUID na URL; **ingest** persiste raw e enfileira; **worker** consome `queue:raw:evolution` e chama **processEvolutionRaw**.
- **Processor** suporta apenas **messages.upsert** para criar/atualizar conversation e inserir conversation_messages; atualiza last_synced_at; marca processed_at ou processing_error no raw event.
- **Idempotência:** ingest por external_event_id; conversation por (tenant, instance, remoteJid); message por (conversation_id, messageId); raw por processed_at.
