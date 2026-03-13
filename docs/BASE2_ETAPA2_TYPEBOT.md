# Base 2 — Etapa 2: Pipeline Typebot (webhook → raw → queue → processamento → normalizado)

> Atualização: o fluxo atual também cobre assinatura HMAC (`X-Webhook-Timestamp` + `X-Webhook-Signature`), rate-limit de webhook, retry/backoff com DLQ no worker e sync de métricas via Typebot API para `bot_metrics_snapshots`.

## 1. Arquivos criados/alterados e responsabilidades

### app/api/webhooks/typebot/[botId]/route.ts
- **Responsabilidade:** Receber POST; validar Content-Type `application/json` e tamanho (máx. 512 KB); chamar validate → parse → ingest; retornar 200 com `{ received: true, id: rawEventId }` ou 4xx/5xx com mensagem genérica (sem vazar detalhes internos).
- **Segurança:** Não loga payload nem secret; 400 (bot id vazio), 404 (bot não encontrado), 401 (secret obrigatório), 403 (secret inválido), 413 (payload grande), 415 (Content-Type), 500 (erro ao persistir/enfileirar).

### server/redis.ts (novo)
- **Responsabilidade:** `createRedisClient()` — cria cliente Redis a partir de `REDIS_URL`; usado na app apenas para enfileirar após ingest. Chamador deve chamar `redis.quit()` após o uso.

### server/integrations/webhook-secret.ts (alterado)
- **Responsabilidade:** `hashWebhookSecret(secret)` — SHA-256 hex do secret (para armazenar em `typebot_bots.webhook_secret_hash` ao configurar o bot). `verifyWebhookSecret(headerValue, storedHash)` — comparação em tempo constante para validar o header.

### server/integrations/typebot/validate.ts
- **Responsabilidade:** `validateTypebotWebhook(request, botIdOrToken)`. Resolve bot por `typebot_bots.id` (botId na URL = UUID do bot). Se `webhook_secret_hash` estiver preenchido, exige header `X-Webhook-Secret` e valida com `verifyWebhookSecret`. Retorna `{ tenantId, typebotBotId }` ou `{ error, status }` (400, 404, 401, 403).

### server/integrations/typebot/parse.ts
- **Responsabilidade:** `parseTypebotWebhookBody(body)`. Extrai `externalEventId` de `resultId`, `submissionId`, `result_id`, `submission_id` ou `id` (quando string); senão `null`. Retorna `{ payload, externalEventId }` ou `{ error }`.

### server/integrations/typebot/ingest.ts
- **Responsabilidade:** Persistir em `typebot_webhook_events` (tenant_id, typebot_bot_id, payload, received_at, external_event_id quando houver). Deduplicação: se `external_event_id` informado e já existir registro com mesmo (tenant_id, typebot_bot_id, external_event_id), retorna 200 com o id existente **sem** inserir nem enfileirar de novo. Caso contrário insere, faz `enqueue(redis, job)` com job `process_typebot_raw` (rawEventId, tenantId, typebotBotId) e retorna `rawEventId`. Usa `createRedisClient()`, enfileira e faz `redis.quit()`.

### workers/queue (existente)
- **Responsabilidade:** `enqueue(redis, job)` e `dequeue(redis, queueName, timeout)`. Job Typebot: `{ type: "process_typebot_raw", rawEventId, tenantId, typebotBotId }`. Fila: `queue:raw:typebot`.

### workers/processors/typebot.ts
- **Responsabilidade:** `processTypebotRaw(job)`. Carrega raw event por id; se já `processed_at` preenchido, retorna ok (idempotente). Obtém `source_external_id` (resultId/submissionId/raw_event_id), `source_integration_id` (integrations.id onde provider=typebot e provider_resource_id=typebot_bot_id). Cria ou localiza lead por (tenant_id, source_provider='typebot', source_external_id); atualiza last_seen_at e opcionalmente email/name/phone/normalized; first_seen_at/last_seen_at coerentes. Insere lead_event com eventType `typebot_webhook`, payload contendo `_rawEventId` para dedup; só insere se ainda não existir evento para esse lead com mesmo `_rawEventId`. UTM: ao **criar** lead novo, se payload tiver utm_*, insere em `utm_attributions` (first_touch, touch_sequence 1). Marca raw event com `processed_at`; em caso de exceção grava `processing_error` (até 1024 chars) e `processed_at`.

### workers/runner.ts (alterado)
- **Responsabilidade:** Além do heartbeat, inicia consumidor da fila `queue:raw:typebot`: loop com `dequeue(redis, QUEUE_RAW_TYPEBOT, 5)`, chama `processTypebotRaw(job)`, loga `[typebot] processed { rawEventId }` em sucesso e `[typebot] processing failed { rawEventId, error }` em falha; erros de consumidor logados como `[typebot] consumer error`.

---

## 2. Fluxo fim a fim

1. **Typebot** envia POST para `/api/webhooks/typebot/[botId]` com body JSON e, se configurado, header `X-Webhook-Secret`.
2. **Rota:** Valida Content-Type e tamanho; chama `validateTypebotWebhook(request, botId)` → bot por id, secret se houver; `parseTypebotWebhookBody(body)` → payload + external_event_id; `ingestTypebotWebhook(...)`.
3. **Ingest:** Se external_event_id e já existir raw com (tenant_id, typebot_bot_id, external_event_id), retorna esse id sem inserir nem enfileirar. Senão: INSERT em `typebot_webhook_events`, LPUSH em `queue:raw:typebot` com job `{ type, rawEventId, tenantId, typebotBotId }`, retorna rawEventId.
4. **Rota** responde 200 `{ received: true, id: rawEventId }`.
5. **Worker** faz BRPOP em `queue:raw:typebot` (timeout 5s); ao receber job chama `processTypebotRaw(job)`.
6. **Processor:** SELECT raw event; se processed_at já preenchido → return ok. Resolve integration id; source_external_id = resultId/submissionId/raw_event_id; busca lead por (tenant_id, typebot, source_external_id). Se existe: UPDATE lead (last_seen_at, email/name/phone se vierem); senão: INSERT lead, e se houver UTM INSERT utm_attributions (first_touch, 1). Dedup lead_event: se já existe evento do lead com payload._rawEventId = raw_event_id, não insere; senão INSERT lead_event. UPDATE raw event SET processed_at. Em erro: UPDATE raw event SET processing_error e processed_at; log no worker.

---

## 3. Decisões de deduplicação

| Camada | Chave / critério | Comportamento |
|--------|-------------------|----------------|
| **Ingest (raw event)** | (tenant_id, typebot_bot_id, external_event_id) quando external_event_id presente | Se já existir linha com esses três, não insere nem enfileira; retorna 200 com id existente. |
| **Ingest (sem external_event_id)** | Nenhuma | Sempre insere e enfileira. Possível duplicata de raw se o provedor reenviar; mitigação no processamento. |
| **Lead** | (tenant_id, source_provider, source_external_id) com source_provider = 'typebot' | Upsert implícito: SELECT por essa chave; se existe atualiza last_seen_at (e dados); senão INSERT. source_external_id = resultId/submissionId do payload ou raw_event_id. |
| **Lead event** | (lead_id, payload._rawEventId) | Antes de inserir, busca lead_events do lead e verifica se algum payload._rawEventId = raw_event_id; se sim não insere (evita duplicar evento ao reprocessar o mesmo raw). |

---

## 4. Limitações assumidas nesta primeira versão

- **Payload Typebot:** Assume estrutura mínima: campos no top-level ou em `payload.variables` (email, name, phone; resultId/submissionId; utm_*). Outros formatos do Typebot podem exigir ajuste no parse.
- **Secret:** Armazenado como SHA-256 hex em `typebot_bots.webhook_secret_hash`; ao configurar o bot (admin) deve-se usar `hashWebhookSecret(secret)` antes de salvar. Header esperado: `X-Webhook-Secret` com o valor em claro.
- **UTM:** Apenas first_touch (touch_sequence 1) ao criar o lead; não preenche last_touch nem múltiplos toques.
- **Funnel:** Não associa lead a funnel/funnel_step; status fixo `new`; sem lead_sources além da integração.
- **Integration:** Se não existir linha em `integrations` para o (tenant, typebot, typebot_bot_id), `source_integration_id` do lead fica null (aceitável).
- **Reprocessamento:** Reprocessar o mesmo job (ex.: worker caiu após processar e antes de marcar processed_at) é idempotente: lead por source_external_id, lead_event por _rawEventId; raw já com processed_at é ignorado no início do processor.
- **Observabilidade:** Apenas logs no worker (sucesso/falha por rawEventId); sem métricas nem tracing ainda.

---

## 5. Segurança e boas práticas

- Rotas de webhook **não** exigem cookie de sessão; identificação por botId (UUID) na URL e, quando configurado, por secret no header.
- Respostas de erro genéricas (ex.: "Bot not found", "Invalid webhook secret"); sem stack trace nem mensagem de banco na resposta.
- Secret nunca logado; comparação em tempo constante (`verifyWebhookSecret`).
- Body limitado a 512 KB; Content-Type obrigatório application/json.
