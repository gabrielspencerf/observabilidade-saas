# Migration Design - Fase B.0 (controlada, sem execucao)

## 1. Objetivo desta etapa
- Desenhar a migration de canais nativos com baixo risco e rollback claro.
- Validar riscos de legado e drift antes de qualquer `ALTER` em producao.
- Nao executar migration nesta etapa.

## 2. Diagnostico do schema atual (evidencia)

### 2.1 `conversations` hoje (estado SQL real)
- Origem:
  - criada em `src/db/migrations/0000_concerned_blacklash.sql` com:
    - `evolution_instance_id` obrigatorio (na epoca),
    - unique original `conversations_tenant_instance_external_unique`.
  - ajustada em `src/db/migrations/0004_uazapi_webhook_and_conversations.sql` para:
    - `evolution_instance_id` nullable,
    - novo campo `uazapi_instance_id`,
    - constraint `conversations_instance_check`:
      - exatamente um entre `evolution_instance_id` e `uazapi_instance_id`.
    - indices unicos parciais:
      - `conversations_tenant_evolution_external_unique`
      - `conversations_tenant_uazapi_external_unique`
- reforco idempotente em `src/db/migrations/0009_add_conversations_uazapi_instance_id.sql`.

### 2.2 Drift relevante SQL x schema TS
- Em `src/db/schema/conversations/conversations.ts`:
  - existem colunas `evolutionInstanceId` e `uazapiInstanceId`,
  - nao estao modelados:
    - `conversations_instance_check`,
    - `conversations_tenant_evolution_external_unique`,
    - `conversations_tenant_uazapi_external_unique`,
    - `conversations_uazapi_instance_idx`.
- Implicacao:
  - risco real de governanca/documentacao: TS nao representa integralmente as constraints efetivas do banco.

### 2.3 Evolucao de `provider_enum`
- Definicao base em `src/db/migrations/0000_concerned_blacklash.sql`:
  - `'google_ads', 'typebot', 'evolution'`.
- Evolucao historica:
  - `src/db/migrations/0003_hardening_integrations.sql` adiciona `uazapi` com `IF NOT EXISTS`.
  - `src/db/migrations/0004_married_wasp.sql` repete adicao com tratamento de excecao.
- Estado atual em `src/db/enums.ts`:
  - `google_ads | typebot | evolution | uazapi`.

### 2.4 Raw events atuais (padrao a preservar)
- Schemas:
  - `src/db/schema/raw-events/evolution-webhook-events.ts`
  - `src/db/schema/raw-events/uazapi-webhook-events.ts`
  - `src/db/schema/raw-events/typebot-webhook-events.ts`
- Padrão:
  - append-only + `processed_at`/`processing_error`,
  - dedup parcial por `(tenant_id, resource_id, external_event_id)` quando `external_event_id` nao nulo.

### 2.5 Consultas dependentes das FKs atuais em `conversations`
- `src/server/dashboard/conversations.ts`:
  - `leftJoin` fixo em `evolutionInstances` e `uazapiInstances`,
  - `instanceDisplay` assume somente esses dois canais.
- `src/server/dashboard/conversation-detail.ts`:
  - mesma suposicao no detalhe.

## 3. Proposta de migration futura (nao executar agora)

## 3.1 Principios de seguranca
- Primeiro expandir (additive), depois endurecer constraint.
- Nao mudar codigo de runtime nesta etapa.
- Tratar qualquer incerteza de legado como bloqueio.

### 3.2 Ordem segura de statements (proposta)
1. **Extensao de enum**
   - `ALTER TYPE provider_enum ADD VALUE IF NOT EXISTS 'chatwoot';`
   - `ALTER TYPE provider_enum ADD VALUE IF NOT EXISTS 'whatsapp_cloud';`
2. **Criar tabelas de recurso**
   - `chatwoot_accounts` (FK tenant, unique por tenant + external_id).
   - `whatsapp_cloud_numbers` (FK tenant, unique por tenant + phone_number_id).
3. **Criar tabelas de raw events**
   - `chatwoot_webhook_events`
   - `whatsapp_cloud_webhook_events`
   - com indices de leitura e unique parcial de dedup por `external_event_id`.
4. **Expandir `conversations` (additive)**
   - adicionar colunas nullable:
     - `chatwoot_account_id`
     - `whatsapp_cloud_number_id`
   - adicionar FKs (`ON DELETE CASCADE` para paridade com integracoes de canal existentes).
5. **Criar novos unique parciais em `conversations`**
   - `(tenant_id, chatwoot_account_id, external_id)` where `chatwoot_account_id` is not null.
   - `(tenant_id, whatsapp_cloud_number_id, external_id)` where `whatsapp_cloud_number_id` is not null.
6. **Substituir constraint de origem unica**
   - drop `conversations_instance_check` atual.
   - criar nova versao exigindo exatamente uma origem entre:
     - `evolution_instance_id`,
     - `uazapi_instance_id`,
     - `chatwoot_account_id`,
     - `whatsapp_cloud_number_id`.
7. **Paridade de schema TS**
   - atualizar arquivos de schema no mesmo pacote da migration (mesmo PR), para reduzir drift.

## 3.3 Forma recomendada da nova constraint
- Usar `num_nonnulls(...) = 1` para reduzir ambiguidade e facilitar leitura.
- Exemplo conceitual:
  - `CHECK (num_nonnulls(evolution_instance_id, uazapi_instance_id, chatwoot_account_id, whatsapp_cloud_number_id) = 1)`.

## 3.4 Bloqueios obrigatorios antes de aplicar
- B1: validar dados legados de `conversations` contra a constraint atual/futura.
- B2: validar inexistencia de duplicatas para novos pares unicos no plano de backfill futuro.
- B3: fechar politica de exclusividade por numero/canal no nivel de negocio.

Sem B1-B3, migration fica **bloqueada para staging/prod**.

## 4. Riscos reais da migration
- R1 (critico): falha na criacao da nova `CHECK` se houver linhas legadas inconsistentes.
- R2 (importante): drift SQL x TS ja existente pode aumentar se migration sair sem atualizar schema TS.
- R3 (importante): ordem incorreta (constraint antes de precheck) pode causar deploy quebrado.
- R4 (importante): dedup de raw events sem chave minima confiavel por canal pode gerar ruido operacional.
- R5 (futuro): dashboard assume apenas Evolution/UAZAPI; nao quebra migration, mas cria debito para fase de implementacao.

## 5. Rollout recomendado da migration (futuro)
- Etapa 1: rodar prechecks (somente leitura).
- Etapa 2: aplicar migration additive em ambiente de teste.
- Etapa 3: reexecutar prechecks + validacao de constraints/indices.
- Etapa 4: liberar implementacao de webhook/worker em fase separada.

## 6. Status da Fase B.0
- Design da migration: concluido.
- Execucao da migration: nao iniciada.
- Bloqueio atual: falta validacao de legado em base real (staging/prod).
