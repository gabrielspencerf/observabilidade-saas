# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [Unreleased]

### Adicionado

- **Canais de mensageria nativos:** Chatwoot e WhatsApp Cloud (Meta) com webhook + dedup + processador (migrations 0019). Filas e DLQ próprias.
- **Meta Ads + Clarity** (migration 0018): OAuth Meta, sync de insights por ad account, snapshots, integração com CAPI; conexão Clarity por tenant + sync de snapshots.
- **Vysen Copilot:** runtime com fallback de modelo (thinking/fast), telemetria em `vysen_usage_events`, pgvector knowledge (migrations 0014/0015), abstração de provider preparada para Agno (`src/server/vysen/runtime/`).
- **RLS por tenant** (migrations 0016/0017): políticas opt-in via `SECURITY_ENFORCE_RLS`, GUCs `app.tenant_id` / `app.bypass_rls` aplicadas por transação.
- **API envelope:** rotas críticas migradas para `apiOk` / `apiError` com headers padronizados (`src/server/http/api-contract.ts`).
- **Worker refactor:** visibility lock via `BRPOPLPUSH`, retry persistente em ZSET (sobrevive a SIGTERM), graceful shutdown com drain, schedulers de delayed + reaper, jitter no backoff. Chatwoot/WA Cloud incluídos no snapshot admin.
- **Stack Swarm com Docker secrets:** `scripts/docker-entrypoint.sh` carrega `/run/secrets/*` como env vars; `POSTGRES_PASSWORD_FILE` nativo; segredos sensíveis fora de `environment:`.
- **Migrate concorrente seguro:** `npm run db:migrate:safe` envolve `drizzle-kit migrate` em `pg_advisory_lock(4242)` para evitar race entre réplicas no boot.
- **Security headers:** CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy em `next.config.ts`.
- **Health endpoints:** `/api/health` público minimal (só DB) + `/api/health/details` autenticado por `HEALTH_DETAILS_TOKEN`.
- **`/api/dashboard/vysen/chat`:** rate-limit por tenant+user (20/min), cap de prompt 4000 chars, scrub de segredos antes do modelo.
- **Migration 0020:** `leads.status` com `DEFAULT 'new'`.
- **Smoke de canais:** `npm run smoke:channels` (Chatwoot, WhatsApp Cloud, dashboard).

### Alterado

- **Workers**: 10 consumers usam `dequeueWithLock` + `ackJob`; retry agendado em ZSET delayed em vez de `setTimeout` em memória.
- **Auth/OAuth Google:** gate `isSuperAdmin` antes de `createSession` (evita sessão órfã); `stateSecret()` lança erro se `GOOGLE_AUTH_STATE_SECRET`/`SESSION_SECRET` ausentes (sem fallback); `switchTenant` rotaciona o token de sessão.
- **Login:** dummy Argon2 hash quando user não existe (fecha timing oracle).
- **Postgres pool:** `statement_timeout` 30s + `idle_in_transaction_session_timeout` 60s, configuráveis via env.
- **CSV exports:** prefixo de fórmula (`= + - @`) neutralizado para evitar CSV injection no Excel/Sheets.
- **Webhook HMAC:** timestamp futuro rejeitado (skew direcional); Evolution sem fallback `x-api-key` em dev.
- **Decrypt de segredos:** `tryDecryptStoredSecret` em `secret-storage.ts` bloqueia uso quando decrypt falha (antes retornava ciphertext bruto).
- **Vysen knowledge:** filtro pgvector separa branches global vs tenant (fecha cross-tenant leak).
- **Meta CAPI:** `access_token` no body POST (antes em query string vazava em logs de proxy).
- **Vysen copilot:** KB references envolvidas em `<reference id=N untrusted="true">…</reference>` + instrução de system prompt para tratar conteúdo como dado.
- **Agno provider:** `VYSEN_AGNO_TOKEN` obrigatório, header `X-Vysen-Token`, `AbortSignal.timeout(10s)`, fallback automático para provider local.
- **`recordProcessingFailure`:** roda dentro de `runWithRlsContext({ bypassRls: true })` para não falhar silenciosamente sob RLS modo tenant.
- **`enqueueWithDedup`** aplicado em syncs `google-ads/meta-ads/clarity` — evita duplicação para mesmo `accountId`/`connectionId`.
- **`getSharedRedis`** singleton nos 5 webhook ingest — elimina handshake TLS por evento.
- **Tenant-assets:** path-traversal blindado (resolve+startsWith), cap de tamanho e MIME whitelist pré-buferização.
- **`log-redact`:** estendido com email/JWT/sk-*/Bearer/query-secrets + helpers `redactSensitiveLog` / `scrubSecretsForLlm`.
- **GitHub Actions:** actions pinadas por subversão, cache `type=gha`, publica `:latest` em push para `main`.
- **Dockerfile:** `HEALTHCHECK` chamando `/api/health` + `ENTRYPOINT` carregando Docker secrets.

### Removido

- **`bullmq`** removido do `package.json` — instalada mas nunca importada (fila é implementação interna em `src/workers/queue/`). Diferença documentada em `docs/REVISAO_GERAL_2026-05.md`.

### Resolvido (DB / migrations)

- **Duplicata 0004**: `0004_uazapi_webhook_and_conversations.sql` renomeado para `0004b_*` e journal atualizado. DB virgem agora aplica migrate sem ambiguidade.

### Documentação

- **`docs/REVISAO_GERAL_2026-05.md`** — auditoria profunda arquivo-por-arquivo cobrindo 10 domínios (auth, API, workers, DB, integrações, Vysen, UI, segurança, infra, docs). 32 findings tratados nesta release.

---

## [0.3.0] - 2026-03-20

### Adicionado

- **Dashboard:** reconexão WhatsApp (Evolution/UAZAPI) em Configurações e entrada em Canais; APIs tenant com proxy seguro para QR/status.
- **Admin:** página Worker & pipeline (filas, métricas e fluxo operacional).
- **Admin:** diagrama relacional de entidades (mapa arquitetural com ligações).

### Alterado

- Mensagens de erro de status/conexão de messaging mais amigáveis (sem expor detalhe técnico ao usuário final).
- Documentação: revisão geral, mapa de endpoints, checklist de segurança, exemplos de deploy e `.gitignore` alinhados ao versionamento seguro.

---

## [0.2.1] - 2025-03-17

### Alterado

- Nova tag de release com todas as atualizações consolidadas (package 0.2.1).
- Estrutura e documentação revisadas para o release.

---

## [0.2.0] - 2025-03-17

### Adicionado

- **Dashboard usuário**
  - Contatos: listagem, import/export CSV.
  - Oportunidades: listagem e edição (estágio, título, valor, modelo contratado).
  - Produtos: listagem e CRUD.
  - Reclamações (complaints): listagem.
  - Onboarding: página e progresso por tenant.
  - PageSpeed: resultados e métricas.
  - Leads: kanban, edição de lead, configuração de funil (`funnel/config`).
  - Configurações: seção de arquivos da empresa.
- **Integrações**
  - UAZAPI: webhooks, ingestão de eventos, paridade com Evolution.
  - Migrations: tabelas `opportunities`, `contacts`, `products`, onboarding, pagespeed, complaints; coluna `uazapi_instance_id` em conversations.
- **UI / Design System**
  - Botões: pegada rounded-xl, variantes outline e tab (ativo/inativo).
  - Fundo granulado no dashboard (`.dashboard-grain`).
  - Botões do super admin padronizados com componente `Button`.
- **API**
  - Rotas em `/api/dashboard/` para oportunidades, contatos, produtos, etc.
  - Webhooks UAZAPI em `/api/webhooks/uazapi/`.

### Alterado

- Migration 0004 idempotente (enum, ADD COLUMN, DROP CONSTRAINT) para ambientes com schema parcial.
- Sidebar dashboard: item Oportunidades; referências visuais alinhadas ao design system.

### Documentação

- `PADRAO_DESENVOLVIMENTO.md`: estrutura de pastas atualizada (contacts, opportunities, products, complaints, onboarding, pagespeed, settings).
- Docs em `docs/`: planos de negócio, import/export, UAZAPI, revisão de páginas.

---

## [0.1.0] - inicial

- Next.js 15, React 19, Drizzle, Postgres, Redis, BullMQ.
- Áreas: landing, login, admin-login, dashboard (home, leads, conversas, Google Ads, funil), admin (integrations, observability, tenants, users).
- Design system CL (brand, sidebar ZincMail, layout Aura).

[0.3.0]: https://github.com/gabrielspencerf/observabilidade-saas/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/gabrielspencerf/observabilidade-saas/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/gabrielspencerf/observabilidade-saas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/gabrielspencerf/observabilidade-saas/releases/tag/v0.1.0
