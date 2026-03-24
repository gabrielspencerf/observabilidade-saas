# Revisão de tabelas e consistência estrutural

Verificação periódica: schema Drizzle ↔ migrations ↔ journal.

## 1. Migrations e journal

Todos os arquivos referenciados em `src/db/migrations/meta/_journal.json` devem existir em `src/db/migrations/*.sql`, na ordem dos `idx`:

| idx | Tag |
|-----|-----|
| 0 | 0000_concerned_blacklash |
| 1 | 0001_google_ads_currency_code |
| 2 | 0002_app_global_config |
| 3 | 0003_hardening_integrations |
| 4 | 0004_married_wasp |
| 5 | 0004_uazapi_webhook_and_conversations |
| 6 | 0005_contacts_opportunities_user_profiles |
| 7 | 0006_negocio_produtos_onboarding_pagespeed_reclamacoes |
| 8 | 0007_pagespeed_metric_date_products_billing_mrr |
| 9 | 0008_seed_onboarding_steps |
| 10 | 0009_add_conversations_uazapi_instance_id |
| 11 | 0010_conversation_messages_sent_by_bot |
| 12 | 0011_auth_password_reset_tokens |
| 13 | 0012_uazapi_structured_credentials |
| 14 | 0013_agent_notifications_followups |
| 15 | 0014_vysen_knowledge_pgvector |
| 16 | 0015_vysen_usage_events |

**Órfãs:** não deve haver arquivo `.sql` em `migrations/` que não esteja no journal (ou migrações manuais documentadas à parte).

## 2. Schema ↔ migrations

Após alterar `src/db/schema/**`, gerar migration com `npm run db:generate`, conferir o SQL e o journal, e só então `npm run db:migrate` em cada ambiente.

## 3. Convenções (resumo)

- PK: `id uuid` com `defaultRandom()` onde aplicável.
- Timestamps: `timestamp(6) with time zone` quando usado no schema.
- Nomes SQL em snake_case; Drizzle em camelCase quando mapeado.

## 4. Comando para aplicar

```bash
npm run db:migrate
```

## 5. Worker, filas e Redis

- Filas e consumidores: `src/workers/runner.ts` (BullMQ / Redis).
- Readiness (heartbeat no Redis): com `REDIS_URL` definida, `npm run worker:readiness` — exit 0 indica worker vivo; exit 1 indica ausência de heartbeat ou problema de conexão.
- Em produção: monitorar profundidade das filas via snapshot de observabilidade (admin) e alertas operacionais conforme [DEPLOY_VPS.md](../DEPLOY_VPS.md) se aplicável.

## 6. Performance de API (lembrete)

- Listagens expostas ao dashboard devem usar **limite** e paginação onde o volume pode crescer (ex.: notificações já usam `limit` no servidor).
- Revisar novas rotas que façam `select` amplo sem `limit` / índice alinhado ao `where`.
