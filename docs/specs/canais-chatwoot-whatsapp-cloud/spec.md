# Spec - Fase A - Canais nativos Chatwoot e WhatsApp Cloud

## 1. Contexto
- Problema atual:
  - O repositorio possui base madura para ingestao de conversas e eventos (`conversations`, `conversation_messages`, `contacts`, `raw-events`, worker), mas o vinculo de conversa esta acoplado a `evolution_instances` e `uazapi_instances`.
  - Isso limita a entrada de novos canais nativos sem ajuste minimo de modelagem.
- Evidencia tecnica:
  - `src/db/schema/conversations/conversations.ts` possui apenas `evolutionInstanceId` e `uazapiInstanceId`.
  - Consultas do dashboard assumem apenas esses dois canais:
    - `src/server/dashboard/conversations.ts`
    - `src/server/dashboard/conversation-detail.ts`
  - Deduplicacao de raw events ja existe por canal em:
    - `src/db/schema/raw-events/evolution-webhook-events.ts`
    - `src/db/schema/raw-events/uazapi-webhook-events.ts`
    - `src/db/schema/raw-events/typebot-webhook-events.ts`
- Por que mudar agora:
  - Precisamos preparar base arquitetural para Chatwoot e WhatsApp Cloud com menor mudanca segura, sem refactor transversal.

## 2. Problema que a Fase A resolve
- Definir modelagem canonica minima para suportar novos canais nativos.
- Definir regra explicita de fonte de verdade para evitar colisao de ingestao no mesmo fluxo.
- Definir ordem segura para implementacao futura (migrations + codigo) sem quebrar a base atual.

## 3. Escopo
- Inclui:
  - Desenho das novas entidades de recurso de canal.
  - Desenho da mudanca minima em `conversations` para suportar novos provedores.
  - Estrategia de deduplicacao de `conversations`, `conversation_messages` e raw events.
  - Regra de fonte de verdade entre `chatwoot`, `whatsapp_cloud`, `evolution`, `uazapi`.
  - Mapeamento de impacto em consultas/telas atuais do dashboard.
  - Ordem segura para futura migration.
- Nao inclui:
  - Implementacao de schema/migration.
  - Rotas/webhooks/worker loops/sync API/outbound WhatsApp.
  - Mudanca de UI.
  - Refactor estrutural amplo.

## 4. Decisoes de modelagem minima (proposta)

### 4.1 Entidades novas necessarias
- `chatwoot_accounts` (novo recurso por tenant):
  - objetivo: representar credencial e contexto operacional do Chatwoot.
  - campos minimos esperados: `tenant_id`, `external_id` (account), `base_url`, `api_token_encrypted`, `inbox_id` (opcional), `label`, `last_synced_at`, `last_sync_error`.
- `whatsapp_cloud_numbers` (novo recurso por tenant):
  - objetivo: representar numero oficial WhatsApp Cloud por tenant.
  - campos minimos esperados: `tenant_id`, `phone_number_id`, `waba_id`, `display_phone`, `access_token_encrypted`, `webhook_verify_token`, `label`, `last_synced_at`, `last_sync_error`.
- Raw events por canal:
  - `chatwoot_webhook_events`
  - `whatsapp_cloud_webhook_events`
  - ambos seguem padrao append-only com `processed_at` e `processing_error`.

### 4.2 Mudancas minimas em `conversations`
- Adicionar referencias opcionais para novos canais (sem remover as atuais):
  - `chatwoot_account_id` (nullable)
  - `whatsapp_cloud_number_id` (nullable)
- Atualizar regra de integridade da conversa para exatamente uma origem operacional preenchida:
  - antes: somente Evolution/UAZAPI
  - depois: Evolution ou UAZAPI ou Chatwoot ou WhatsApp Cloud (exatamente uma).
- Manter `external_id` como identificador externo da thread no contexto da origem operacional.

### 4.3 Extensao de providers/enums
- Estender `provider_enum` para incluir:
  - `chatwoot`
  - `whatsapp_cloud`
- Manter compatibilidade retroativa com `evolution`, `uazapi`, `typebot`, `google_ads`.

## 5. Regra canonica de origem operacional (fonte de verdade)
- Regra central:
  - Cada conversa deve ter exatamente uma origem operacional ativa.
  - A origem e inferida pela referencia de recurso preenchida na linha da conversa.
- Regra anti-colisao:
  - O mesmo numero/fluxo nao pode operar simultaneamente por dois caminhos ativos no mesmo tenant.
  - Quando Chatwoot for origem operacional para um numero, nao ativar WhatsApp Cloud direto para o mesmo numero (e vice-versa).
- Resultado esperado:
  - Evita duplicacao caotica de fonte de verdade.
  - Mantem auditoria clara de origem por conversa.

## 6. Deduplicacao canonica

### 6.1 Conversations
- Chave de dedup por contexto de canal:
  - `(tenant_id, evolution_instance_id, external_id)` quando Evolution.
  - `(tenant_id, uazapi_instance_id, external_id)` quando UAZAPI.
  - Novo: `(tenant_id, chatwoot_account_id, external_id)` quando Chatwoot.
  - Novo: `(tenant_id, whatsapp_cloud_number_id, external_id)` quando WhatsApp Cloud.

### 6.2 Conversation messages
- Dedup minima por conversa:
  - `(conversation_id, external_id)` quando `external_id` existir.
- Quando nao houver `external_id` confiavel no payload:
  - usar regra de fallback em processor futuro, sempre registrando `payload` e `sent_at`.

### 6.3 Raw events
- Chave minima por canal:
  - Chatwoot: `(tenant_id, chatwoot_account_id, external_event_id)` quando `external_event_id` nao nulo.
  - WhatsApp Cloud: `(tenant_id, whatsapp_cloud_number_id, external_event_id)` quando `external_event_id` nao nulo.
- Manter padrao atual:
  - replay guard via hash/fingerprint no webhook.
  - idempotencia no processamento assincrono.

## 7. Decisoes explicitas solicitadas

### A) Chatwoot account vs inbox
- Decisao para MVP de Fase A:
  - Modelar `chatwoot_accounts` como recurso principal.
  - Tratar `inbox_id` como campo opcional no recurso (nao criar tabela separada de inbox agora).
- Justificativa:
  - Menor mudanca segura para iniciar.
  - Evita explodir escopo de modelagem antes de validar ingestao real.
  - Permite evoluir para multi-inbox depois sem quebrar conceito.
- Simplificacao assumida:
  - 1 conta Chatwoot por registro e, no MVP, 1 inbox principal por registro quando necessario.

### B) WhatsApp Cloud external_id de conversa
- Decisao para MVP de Fase A:
  - Assumir 1 conversa operacional por contato/canal no recorte inicial.
  - `conversations.external_id` no WhatsApp Cloud representa o identificador do contato (wa_id/phone normalizado), contextualizado por `whatsapp_cloud_number_id`.
- Justificativa:
  - Alinha com padrao operacional atual de thread por contato.
  - Reduz risco de fragmentacao de conversa no inicio.
- Limite conhecido:
  - Se futuramente houver requisito de multiplas threads simultaneas por contato, revisitar chave operacional.

### C) Dedup de raw events
- Decisao:
  - Exigir chave de dedup por `external_event_id` quando presente.
  - Se payload nao trouxer id externo confiavel, manter replay guard + idempotencia de processor como protecao secundaria.

### D) Impacto no dashboard de conversas
- Consultas que precisam ficar tolerantes a novos canais (futuro, fora da Fase A):
  - `src/server/dashboard/conversations.ts`
  - `src/server/dashboard/conversation-detail.ts`
- Ajuste esperado no futuro:
  - manter joins com Evolution/UAZAPI e incluir resolucao condicional para Chatwoot/WhatsApp Cloud, sem assumir apenas dois canais.

## 8. Riscos a validar antes da migration futura
- R1: Constraint de origem unica em `conversations` pode bloquear dados legados se houver inconsistencias preexistentes.
- R2: Divergencia entre schema TS e SQL (historico ja mostrou casos) pode gerar drift de governanca.
- R3: Definicao de `external_id` no WhatsApp Cloud pode nao cobrir todos os casos de sessao/thread.
- R4: Regras de anti-colisao por numero/canal precisam de validacao de negocio antes de enforcement.

## 9. Ordem segura apos a Fase A (apenas sequenciamento)
1. Validar spec e invariantes com stakeholders tecnicos e produto.
2. Preparar migration SQL de baixo risco em passos reversiveis.
3. Ajustar schema TS em paridade com migration.
4. Implementar webhook ingest Chatwoot (MVP).
5. Implementar sync/backfill Chatwoot.
6. Implementar webhook + fluxo basico WhatsApp Cloud.
7. Amarrar observabilidade e reprocessamento.

## 10. Criterios de aceite da Fase A (documental)
- [ ] Escopo de Fase A definido e fechado sem codigo.
- [ ] Entidades novas e mudancas minimas em `conversations` documentadas.
- [ ] Regra de fonte de verdade definida sem ambiguidade.
- [ ] Estrategia de dedup definida para conversas, mensagens e raw events.
- [ ] Impactos em consultas do dashboard mapeados.
- [ ] Ordem segura para implementacao futura definida.
