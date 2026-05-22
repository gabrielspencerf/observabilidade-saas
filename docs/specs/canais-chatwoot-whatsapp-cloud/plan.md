# Plan - Canais nativos Chatwoot e WhatsApp Cloud

## Status geral por fase

| Fase | Descrição | Status | Data |
|------|-----------|--------|------|
| A | Spec + Plan + Validation documental | ✅ Concluída | 2026-04 |
| B.0 | Migration design + precheck | ✅ Concluída | 2026-04 |
| B.0.1 | Execução dos prechecks de legado | ✅ Concluída (local) | 2026-04-24 |
| B.1 | Migration SQL + schema TS | ✅ Concluída | 2026-04-24 |
| B.2 | Webhook ingest + worker consumers | ✅ Concluída | 2026-04-24 |
| B.3 | Processamento real (conversations + messages) | ✅ Implementada + validada localmente | 2026-04-24 |
| B.4 | Dashboard tolerante a novos canais | ✅ Backend concluído; validação visual pendente | 2026-04-24 |
| B.5 | Observabilidade, smoke tests, outbound WA Cloud | 🔄 Em andamento | 2026-04-24 |

---

## 1. Fase A — Objetivo e resultado

- Formalizar o desenho arquitetural minimo para Chatwoot e WhatsApp Cloud sem implementar codigo.
- Congelar fronteiras de modelagem para reduzir risco na fase de migration e implementacao.
- **Resultado:** pacote documental completo em `docs/specs/canais-chatwoot-whatsapp-cloud/`.

---

## 2. Fase B.1 — Migration SQL + schema TS (concluída)

### O que foi entregue

**Schema TS (em paridade com SQL):**
- `src/db/enums.ts` — `chatwoot` e `whatsapp_cloud` adicionados ao `provider_enum`
- `src/db/schema/integrations/chatwoot-accounts.ts` — nova tabela por tenant
- `src/db/schema/integrations/whatsapp-cloud-numbers.ts` — nova tabela por tenant
- `src/db/schema/raw-events/chatwoot-webhook-events.ts` — raw events append-only
- `src/db/schema/raw-events/whatsapp-cloud-webhook-events.ts` — raw events append-only
- `src/db/schema/conversations/conversations.ts` — 2 novas colunas nullable + CHECK atualizado + 4 unique parciais

**Migration SQL:**
- `src/db/migrations/0019_chatwoot_whatsapp_cloud_channels.sql`
- aplicada manualmente em local (via `scripts/apply-migration-0019.ts`, removido após uso)
- journal atualizado: idx 20, tag `0019_chatwoot_whatsapp_cloud_channels`

**Constraint atualizada:**
- antes: `CHECK (exatamente evolution OU uazapi)`
- depois: `CHECK (num_nonnulls(evolution_instance_id, uazapi_instance_id, chatwoot_account_id, whatsapp_cloud_number_id) = 1)`

**Nota operacional:**
- migration 0019 foi aplicada diretamente via driver postgres (não via `drizzle-kit migrate`) porque o drizzle-kit requer snapshot JSON para aplicar migrations manuais.
- em staging/prod: executar o SQL de `0019_chatwoot_whatsapp_cloud_channels.sql` manualmente via psql ou ferramenta de migração aprovada.

---

## 3. Fase B.2 — Webhook ingest + worker consumers (concluída)

### O que foi entregue

**Módulos de integração:**
- `src/server/integrations/chatwoot/{validate,parse,ingest,index}.ts`
  - validação: lookup por UUID interno + HMAC-SHA256 via `x-chatwoot-signature`
  - parse: extrai `eventType` e `externalEventId` do payload Chatwoot
  - ingest: persiste raw event com dedup + enfileira `process_chatwoot_raw`
- `src/server/integrations/whatsapp-cloud/{validate,parse,ingest,index}.ts`
  - validação GET (hub verify): `hub.verify_token` contra `whatsapp_cloud_numbers.webhook_verify_token`
  - validação POST: HMAC-SHA256 via `x-hub-signature-256` usando `META_APP_SECRET`
  - parse: extrai eventos de `entry[].changes[].value.messages[]`
  - ingest: persiste raw event com dedup + enfileira `process_whatsapp_cloud_raw`

**Rotas de webhook:**
- `POST /api/webhooks/chatwoot/[accountId]` — rate limit + replay guard + ingest
- `GET /api/webhooks/whatsapp-cloud/[numberId]` — hub verification Meta
- `POST /api/webhooks/whatsapp-cloud/[numberId]` — eventos Meta + rate limit + ingest

**Worker:**
- `src/workers/processors/chatwoot.ts`
- `src/workers/processors/whatsapp-cloud.ts`
- `src/workers/queue/types.ts` — `JobProcessChatwootRaw`, `JobProcessWhatsappCloudRaw`
- `src/workers/queue/client.ts` + `index.ts` — `QUEUE_RAW_CHATWOOT`, `QUEUE_RAW_WHATSAPP_CLOUD`, `DLQ_RAW_CHATWOOT`, `DLQ_RAW_WHATSAPP_CLOUD`
- `src/workers/runner.ts` — `loopChatwoot()`, `loopWhatsappCloud()` adicionados

**Segurança:**
- `src/server/security/webhook-replay.ts` — providers `chatwoot` e `whatsapp_cloud` adicionados ao tipo union

---

## 4. Fase B.3 — Processamento real (implementada + validada localmente)

### O que foi entregue

**Chatwoot (`src/workers/processors/chatwoot.ts`):**
- `conversation_created` / `conversation_updated` fazem upsert em `conversations` com `chatwootAccountId`
- `message_created` grava `conversation_messages` com dedup por `(conversation_id, external_id)`
- resolve/cria contato a partir de telefone/e-mail do payload
- ignora evento privado sem erro
- enfileira `classify_conversation` apenas para mensagem nova

**WhatsApp Cloud (`src/workers/processors/whatsapp-cloud.ts`):**
- evento `messages` faz upsert da conversa por `(tenant_id, whatsapp_cloud_number_id, wa_id)` + insert da mensagem
- evento `statuses` é acknowledged no MVP sem atualizar status de linha
- resolve/cria contato a partir do `wa_id`
- enfileira `classify_conversation` apenas para mensagem nova

**Dashboard:**
- `src/server/dashboard/conversations.ts` já resolve Evolution, UAZAPI, Chatwoot e WhatsApp Cloud
- `src/server/dashboard/conversation-detail.ts` idem

### Evidência local executada em 2026-04-24

- `npm run smoke:channels`
- validado:
  - Chatwoot: criação de conversa, dedup de mensagem, ignore de evento privado, `processing_error`, enqueue único de classificação
  - WhatsApp Cloud: criação de conversa, dedup de mensagem, `statuses` acknowledged, `processing_error`, enqueue único de classificação
  - Dashboard: `instanceDisplay` correto para Chatwoot e WhatsApp Cloud em listagem e detalhe

---

## 5. Fase B.4 — Dashboard tolerante a novos canais (backend concluído)

- backend já suporta resolução de canal para Evolution, UAZAPI, Chatwoot e WhatsApp Cloud
- débito restante: validação visual nas páginas de conversa e eventual ajuste fino de copy/UI
- `src/components/dashboard-sidebar.tsx` e páginas de conversa seguem como ponto de revisão visual, não de modelagem

---

## 6. Fase B.5 — Observabilidade e smoke (em andamento)

- `scripts/smoke-api.ts` expandido para validar guardrails de Chatwoot e WhatsApp Cloud:
  - hub verification GET
  - HMAC (`x-chatwoot-signature`, `x-hub-signature-256`)
  - dedup de raw event na ingestão
  - uso de `env.metaAppSecret`
- `scripts/smoke-worker.ts` expandido para exigir filas/loops de `chatwoot` e `whatsapp-cloud`
- novo `scripts/smoke-channels.ts`: smoke local de pipeline `raw event -> processor -> conversations/messages`
- `scripts/db-seed-synthetic-conversations.ts` consolidado com `chatwoot_accounts` e `whatsapp_cloud_numbers`
- `META_APP_SECRET` documentada em `.env.example`; credencial de Chatwoot documentada como tenant-scoped em `chatwoot_accounts`
- próximo gate: staging/prod com precheck da migration 0019 + segredos reais

---

## 7. Riscos remanescentes

| Risco | Impacto | Status |
|-------|---------|--------|
| R1: dados legados inconsistentes com nova CHECK | Alto | Precheck local aprovado; pendente staging/prod |
| R2: drift SQL×TS | Baixo | B.1 aplicou em paridade |
| R3: `external_id` WA Cloud não cobre todos os casos de thread | Médio | Decisão de MVP documentada na spec |
| R4: anti-colisão por número/canal sem enforcement de negócio | Médio | Constraint no banco garante; UI não valida ainda |
| R5: dashboard/UI ainda sem validação visual com payload real | Baixo | Backend validado; falta conferência visual/real |

---

## 8. Checklist de preparação para rollout após B.3

- [x] Mapeamento canônico de `externalId` de conversa para Chatwoot: `conversation.id`
- [x] Mapeamento canônico de `externalId` de conversa para WhatsApp Cloud: `wa_id`
- [x] Validar localmente processadores, dedup, `processing_error` e labels de dashboard
- [ ] Confirmar estrutura real do payload Chatwoot com instância real
- [ ] Confirmar estrutura real do payload WhatsApp Cloud com número real
- [ ] Executar precheck 0019 em staging/prod antes de aplicar migration
- [ ] Validar segredos reais de staging/prod (`META_APP_SECRET` e credenciais Chatwoot)
- [ ] Definir critério de GO/NO-GO com health, DLQ e `processing_failures`
- [ ] Definir plano de rollback da constraint se houver dado legado inconsistente em prod
