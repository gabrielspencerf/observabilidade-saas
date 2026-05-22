# Validation - Canais nativos Chatwoot e WhatsApp Cloud

## Status por fase

| Fase | Checklist | Status |
|------|-----------|--------|
| A — spec/plan | §4 Revisão da spec | ✅ Concluído |
| A — spec/plan | §5 Revisão da futura migration | ✅ Concluído (B.1) |
| A — spec/plan | §6 Critérios de aceite Fase A | ✅ Concluído |
| B.0 | §8 Pre-migration (design + precheck) | ✅ Concluído |
| B.0.1 | Execução dos prechecks em base real | ⚠️ Local aprovado; pendente staging/prod |
| B.1 | Migration SQL + schema TS aplicados | ✅ Concluído |
| B.2 | Webhook ingest + worker consumers | ✅ Concluído |
| B.3 | Processamento real + validação local | ✅ Concluído localmente em 2026-04-24; staging/prod pendente |

---

## 1. Objetivo

Validar coerência da modelagem e das entregas antes de avançar cada fase.

---

## 2. Invariantes — verificação pós-B.1

| ID | Invariante | Status |
|----|------------|--------|
| I1 | Cada conversa tem exatamente uma origem operacional | ✅ Enforced por `conversations_instance_check` com `num_nonnulls = 1` |
| I2 | Não pode existir conversa sem origem operacional válida | ✅ Mesma constraint + NOT NULL nas FKs de instância existentes |
| I3 | Dedup de conversa por tenant + recurso de canal + `external_id` | ✅ 4 unique parciais em `conversations` (evolution, uazapi, chatwoot, wc) |
| I4 | Dedup de raw events por tenant + recurso + `external_event_id` | ✅ Unique parcial em cada tabela de raw events |
| I5 | `conversation_messages` idempotente por `(conversation_id, external_id)` | ✅ Mantido |
| I6 | Regra de anti-colisão por número/canal definida antes da implementação | ✅ Definida na spec §5; enforcement pela CHECK |
| I7 | Evolution/UAZAPI permanecem compatíveis | ✅ Verificado: 0 linhas inválidas no precheck B.0.1 |

---

## 3. Validação do banco (pós-migration 0019)

Executado em 2026-04-24 (local, seed sintético):

| Check | Resultado | Decisão |
|-------|-----------|---------|
| 4 novas tabelas criadas | `chatwoot_accounts`, `whatsapp_cloud_numbers`, `chatwoot_webhook_events`, `whatsapp_cloud_webhook_events` | ✅ ok |
| `conversations_instance_check` atualizada | `num_nonnulls(...) = 1` cobrindo 4 canais | ✅ ok |
| Novos unique parciais em `conversations` | `chatwoot_external_unique`, `wc_external_unique` | ✅ ok |
| `provider_enum` expandido | `google_ads, typebot, evolution, uazapi, whatsapp_cloud, chatwoot` | ✅ ok |
| Precheck B.0.1 sem bloqueios | 0 linhas inválidas em todos os checks críticos | ✅ ok |

**Pendente:** repetir precheck e migration em staging/prod com dados reais representativos.

---

## 3.1 Validação local B.3 (executada em 2026-04-24)

Comandos executados:

- `npm run typecheck`
- `npm run smoke:api`
- `npm run smoke:worker`
- `npm run smoke:channels`

Evidências objetivas:

- `smoke:api`: guardrails de Chatwoot e WhatsApp Cloud presentes
  - `x-chatwoot-signature`
  - `x-hub-signature-256`
  - hub verification GET
  - anti-replay
  - dedup de raw event
  - uso de `env.metaAppSecret`
- `smoke:worker`: filas e loops de `chatwoot` e `whatsapp-cloud` presentes no runner
- `smoke:channels`: pipeline local validado de ponta a ponta
  - Chatwoot: cria conversa, grava mensagem, deduplica replay, ignora privado, registra `processing_error`, enfileira classificação uma vez
  - WhatsApp Cloud: cria conversa, grava mensagem, deduplica replay, acknowledged de `statuses`, registra `processing_error`, enfileira classificação uma vez
  - Dashboard: `instanceDisplay` correto para Chatwoot e WhatsApp Cloud em listagem e detalhe

---

## 4. Checklist de revisão da spec (Fase A)

- [x] Problema da Fase A objetivo e baseado no estado real do repo
- [x] Escopo e fora de escopo sem ambiguidade
- [x] Entidades novas descritas com campos mínimos necessários
- [x] Mudança mínima em `conversations` clara
- [x] Regra de origem operacional única explícita
- [x] Deduplicação de conversas/mensagens/raw events explícita
- [x] Política de fonte de verdade entre os 4 canais definida
- [x] Impacto em `conversations.ts` e `conversation-detail.ts` documentado
- [x] Ordem segura para implementação futura definida

---

## 5. Checklist de migration (B.1)

- [x] Migration aditiva antes de mudança destrutiva
- [x] Nova constraint de origem única validada contra dados locais
- [x] Índices únicos parciais por canal especificados e criados
- [x] Extensão de `provider_enum` compatível (ADD VALUE IF NOT EXISTS)
- [x] Estratégia de rollback documentada (drop constraint + drop colunas nullable + drop tabelas)
- [x] Schema TS e SQL atualizados em paridade na mesma entrega

---

## 6. Checklist de ingestão (B.2)

- [x] Rota Chatwoot com validação HMAC-SHA256 (`x-chatwoot-signature`)
- [x] Rota WhatsApp Cloud com hub verification (GET) e HMAC-SHA256 (POST via `META_APP_SECRET`)
- [x] Rate limit por canal e recurso
- [x] Replay guard para ambos os canais
- [x] Raw events persistidos com dedup por `external_event_id`
- [x] Jobs enfileirados para worker consumir
- [x] Consumer loops no `runner.ts`
- [x] DLQ configuradas para novos canais

---

## 7. Checklist adicional B.0 (pre-migration)

- [x] `migration-design.md` revisado
- [x] `migration-precheck.md` revisado e aprovado
- [x] `precheck-execution.md` revisado e aprovado
- [x] Queries de precheck executadas (local com seed sintético)
- [x] Resultado sem bloqueio crítico
- [x] Evidência registrada em `docs/log/REGISTRO.md`
- [ ] **Repetir em staging/prod antes de aplicar migration em produção**

---

## 8. Critérios de aceite para B.3

- [x] Processor Chatwoot: upsert correto de conversa + mensagem com dedup
- [x] Processor WhatsApp Cloud: upsert correto de conversa + mensagem com dedup
- [x] `processedAt` atualizado em caminhos de sucesso e erro validados localmente
- [x] `processing_error` registrado em falha
- [x] Enfileiramento de `classify_conversation` para novas mensagens
- [ ] Sem crescimento anormal de DLQ após habilitar processamento real em staging/prod
- [x] Smoke local: fixture JSON → raw event gravado → processor executado → conversa/mensagem criados
