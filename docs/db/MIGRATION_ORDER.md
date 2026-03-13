# Ordem dos arquivos de migration

O Drizzle Kit gera uma única migration por execução de `drizzle-kit generate`. Para alinhar com as etapas do schema, duas abordagens possíveis:

## Abordagem 1: Uma migration por etapa (recomendada para setup inicial)

Rodar `drizzle-kit generate` **uma vez** após todos os schemas estarem prontos. O Kit gera um único arquivo SQL com todas as tabelas na ordem correta (respeitando FKs). A ordem lógica das tabelas na migration segue as dependências:

1. Enums (criados primeiro)
2. **Auth:** tenants → users → roles → permissions → role_permissions → memberships → sessions
3. **Integrações:** integrations → google_ads_accounts → typebot_bots → evolution_instances
4. **Raw events:** typebot_webhook_events → evolution_webhook_events → google_ads_sync_logs
5. **Funis e leads:** funnels → funnel_steps → lead_sources → leads → utm_attributions → lead_events
6. **Conversas:** conversations → conversation_messages
7. **Snapshots:** campaign_snapshots → bot_metrics_snapshots → instance_status_logs → funnel_step_metrics_snapshot
8. **IA, alertas, auditoria:** ai_classifications → kpi_rules → alerts → audit_logs → processing_failures

## Abordagem 2: Migrations incrementais por domínio

Se quiser um arquivo de migration por domínio (útil para histórico e rollback granular):

1. **0001_auth** — Exportar apenas schemas em `schema/auth` + enums usados (nenhum). Rodar generate com schema filtrado (ex.: schema: "./src/db/schema/auth/index.ts") ou gerar e depois editar o SQL para conter só as tabelas auth.
2. **0002_integrations** — integrations + google_ads_accounts + typebot_bots + evolution_instances (e provider_enum).
3. **0003_raw_events** — typebot_webhook_events, evolution_webhook_events, google_ads_sync_logs.
4. **0004_funnels_leads** — funnels, funnel_steps, lead_sources, leads, utm_attributions, lead_events (e lead_status_enum, provider_enum já criados).
5. **0005_conversations** — conversations, conversation_messages (e conversation_status_enum).
6. **0006_snapshots** — campaign_snapshots, bot_metrics_snapshots, instance_status_logs, funnel_step_metrics_snapshot.
7. **0007_ai_alerts_audit** — ai_classifications, kpi_rules, alerts, audit_logs, processing_failures (e enums restantes).

O Drizzle Kit padrão não suporta múltiplos arquivos de schema por generate; para abordagem 2 é necessário usar configurações separadas por etapa ou dividir o SQL gerado manualmente em vários arquivos na pasta `migrations/`.

## Ordem recomendada dos arquivos na pasta `migrations/`

Se você gerar uma única migration, o nome será algo como `0000_xxx.sql`. Se dividir manualmente, use a ordem:

```
src/db/migrations/
├── 0000_enums.sql          (opcional; enums podem vir no início da primeira migration)
├── 0001_auth.sql
├── 0002_integrations.sql
├── 0003_raw_events.sql
├── 0004_funnels_leads.sql
├── 0005_conversations.sql
├── 0006_snapshots.sql
└── 0007_ai_alerts_audit.sql
```

Ou, com generate único:

```
src/db/migrations/
└── 0000_initial.sql   (tudo na ordem de dependência)
```

## Verificações pós-geração

- **Índices únicos parciais:** Conferir se os `CREATE UNIQUE INDEX ... WHERE ...` foram gerados para `leads` (3 índices) e `ai_classifications` (1 índice). Se não, adicionar SQL manual na migration.
- **Enums:** Conferir se todos os `CREATE TYPE ... AS ENUM` aparecem antes do primeiro uso nas tabelas.
- **NOTICEs de truncamento:** Se ao rodar `db:migrate` aparecerem avisos do tipo "o identificador ... será truncado", são inofensivos: o Postgres limita nomes a 63 caracteres e trunca FKs longas geradas pelo Drizzle. A migration segue com sucesso. Detalhes em [docs/log/REGISTRO.md](../../log/REGISTRO.md) (entrada 1.10).
