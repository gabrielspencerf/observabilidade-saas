# Revisão follow-up 2026-05 — Execução

> **Escopo**: ata da execução completa dos findings de `docs/REVISAO_GERAL_2026-05.md`.
> **Data**: 2026-05-22 · **Branch**: `main` · **Commits**: 11 (base `a2dd2f6` → HEAD `5d571cd`).
> **Diff agregado**: 119 arquivos · **+8124 / -1730** linhas.

---

## 0. Sumário executivo

A auditoria de 2026-05 (`docs/REVISAO_GERAL_2026-05.md`) catalogou ~80 findings
em 10 domínios, com 12 críticos e ~20 altos por área. **Todos os críticos**
foram resolvidos. Dos altos, **a grande maioria também** — restam apenas itens
explicitamente deferidos com justificativa documentada (ver §3).

### Estado da suíte após execução

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | ✅ limpo (zero erros) |
| `npm test` (3 suítes / 9 testes) | ✅ 9 pass / 0 fail |
| `npm run smoke:web` | ✅ ok |
| `npm run smoke:api` | ✅ ok |
| `npm run smoke:worker` | ✅ ok |
| `npm run smoke:channels` | ✅ ok |
| `npm run lint` | ✅ 0 erros (warnings preexistentes mantidos) |

### Estado da revisão por domínio (vs. snapshot inicial)

| Domínio | Inicial | Final |
|---|---|---|
| Auth/RBAC | 🟠 | 🟢 |
| API/Webhooks | 🟠 | 🟢 |
| Workers/Filas | 🔴 | 🟢 |
| DB/Migrations | 🔴 | 🟢 |
| Integrações externas | 🟠 | 🟢 |
| Vysen Copilot | 🔴 | 🟢 |
| UI Admin/Dashboard | 🟡 | 🟢 |
| Segurança/Hardening | 🔴 | 🟢 |
| Build/Deploy/Infra | 🔴 | 🟢 |
| Documentação | 🟠 | 🟢 |

---

## 1. Os 11 commits da sessão

| # | Hash | Tema | Diff |
|---|---|---|---|
| 1 | `b180bc7` | Top 12 críticos + altos auth/DB/webhook/observabilidade | +3741 / -655 (58 arq) |
| 2 | `ebce2e3` | Docs P0 (CHANGELOG / GETTING_STARTED / PADRAO / RESUMO) + bullmq removido | +798 / -795 (6) |
| 3 | `c451fd7` | DB hardening (knowledge CHECK, vysen correlation, dedup classify) | +141 / -10 (5) |
| 4 | `4cef5e6` | UI: AbortController em forms + autoComplete + notifications skeleton/retry | +184 / -85 (7) |
| 5 | `e0d06f7` | Segurança+infra (IMDS, CSRF origin, swarm rolling-update, heartbeat pod-id) | +1161 / -15 (9) |
| 6 | `4c8d602` | UI/DB: formatDate helper, kanban com teclado, HNSW, opp/complaint enums | +260 / -42 (11) |
| 7 | `40bf62e` | UI: formatDate completo (14 callsites) | +50 / -82 (15) |
| 8 | `4bce211` | DB: índices `(tenant_id, created_at)` + cap Content-Length | +59 / 0 (4) |
| 9 | `4dd0153` | Vysen: cache de embeddings + request.signal + retention de usage | +133 / -1 (5) |
| 10 | `a19cb58` | Worker: logger JSON estruturado + contadores Redis | +253 / -16 (4) |
| 11 | `5d571cd` | Worker total + `/api/metrics` Prometheus + UI metrics + docs cleanup | +1388 / -73 (12) |

---

## 2. Antes / depois por área

### 2.1 Workers / Filas
**Antes**: fila caseira sobre `BRPOP`, retry em `setTimeout` perdido no SIGTERM,
sem visibility timeout, Chatwoot/WA Cloud fora do snapshot, console.* não-estruturado.

**Depois**:
- `BRPOPLPUSH` com processing list + tracker ZSET (visibility lock).
- Retry persistente em ZSET `delayed` (sobrevive a restart).
- Jitter ±30% no backoff (anti thundering-herd).
- Graceful shutdown com drain de jobs ativos (timeout 25 s).
- `tickDelayedScheduler` (2 s) + `tickReaper` (60 s, threshold 5 min).
- 10 consumers refatorados via `executeAndAck`.
- `enqueueWithDedup` em `sync_google_ads/meta_ads/clarity` e `classify_conversation`.
- `getSharedRedis()` singleton nos 5 ingest paths (sem handshake TLS por evento).
- Heartbeat agregado + por-instância (`worker:heartbeat:<podId>`).
- Logger JSON-line com correlação (`jobId`/`tenantId`/`queue`/`attempt`).
- Contadores Redis: `processed`/`failed`/`retried`/`sent_to_dlq`/`reaper_revived`.
- `recordProcessingFailure` dentro de `runWithRlsContext({ bypassRls: true })`.

### 2.2 Auth / RBAC
- `stateSecret()` lança erro fatal sem fallback `"fallback"`.
- OAuth callback: gate `isSuperAdmin` antes de `createSession`.
- `switchTenant` rotaciona o token de sessão.
- Login com dummy Argon2 quando user não existe (fecha timing oracle).
- `buildClearCookieHeader` replica `Secure`/`SameSite`/`Path`.
- Rate-limit em `/api/auth/password-reset/confirm` (10/15 min).
- CSRF com Origin/Referer check complementar (`X-Forwarded-Host`/`Proto`).

### 2.3 API / Webhooks
- Path traversal em tenant-assets blindado (`resolve` + `startsWith`).
- Tenant-assets: `Content-Length` + MIME whitelist antes de buferizar.
- CSV imports (leads/contacts): cap por `Content-Length`.
- HMAC rejeita timestamp futuro (skew direcional).
- Evolution: bypass `x-api-key` em dev removido.
- Webhook replay: usa `getSharedRedis()` + fallback graceful (unique constraint cobre).
- `/api/health` (público minimal, só DB) + `/api/health/details` (token).

### 2.4 DB / Migrations
- Duplicata `0004_uazapi_*` renomeada para `0004b_*` (DB virgem sobe agora).
- `npm run db:migrate:safe`: wrapper com `pg_advisory_lock(4242)`.
- Pool: `statement_timeout=30s` + `idle_in_transaction_session_timeout=60s`.
- Migrations novas:
  - `0020_leads_status_default` — DEFAULT `'new'`.
  - `0021_knowledge_scope_check` — CHECK constraint scope/tenant_id.
  - `0022_vysen_usage_events_correlation` — `request_id` + `estimated_cost_usd` + índice parcial.
  - `0023_knowledge_embeddings_hnsw` — IVFFlat → HNSW.
  - `0024_opportunity_complaint_enums` — varchar → pgEnum.
  - `0025_operational_created_at_indexes` — `(tenant_id, created_at DESC)` em complaints/contacts/opportunities/products.

### 2.5 Vysen Copilot
- Filtro pgvector com branches separados (`scope='global' AND tenant_id IS NULL`).
- KB references em `<reference id=N untrusted="true">…</reference>` + system prompt.
- `tenantDataTool` scrub e estrutura preservados.
- Rate-limit 20 req/min/(tenant,user) + cap 4000 chars de prompt.
- `scrubSecretsForLlm` no input (JWT/sk-*/Bearer/query).
- Cache de embeddings (Redis, TTL 1 h).
- `request.signal` propagado nas chamadas OpenAI.
- Retention de `vysen_usage_events` (90 d default, configurável).
- Agno provider: `VYSEN_AGNO_TOKEN` obrigatório + `AbortSignal.timeout(10s)` + fallback automático.

### 2.6 Integrações externas
- Meta CAPI: `access_token` no body POST (não mais em query string).
- Decrypt com fallback texto puro removido: `tryDecryptStoredSecret` (helper centralizado em `secret-storage.ts`) — bloqueia uso quando decrypt falha, com `SECURITY_ALLOW_PLAINTEXT_SECRETS` gating só em dev.
- `safeFetch` bloqueia `metadata.google.internal` / `metadata.aws.amazon.com` / `metadata.azure.com` / `instance-data.ec2.internal`.

### 2.7 UI Admin / Dashboard
- 6 forms com `AbortController` (evolution/uazapi/typebot new + evolution/uazapi/tenants edit).
- 8 inputs de credencial com `autoComplete="new-password"`.
- Notifications: 3 skeleton cards animados + botão "Tentar novamente" + `load` em `useCallback(AbortSignal)`.
- Kanban: `moveLead(leadId, targetStatus)` extraído; `<select>` acessível em cada card.
- CSV exports: `escapeCsvValue` neutraliza prefixos de fórmula (`=+-@\t\r`).
- Bloco de "Contadores acumulados" no `/superadmin/worker-pipeline` (5 métricas).
- `src/lib/i18n/date.ts`: helpers centrais (`formatDate`/`formatDateTime`/`formatTime`/`formatDateMedium`/`formatRelative`/`formatCustom`). **17 callsites migrados** — zero `Intl.DateTimeFormat("pt-BR", ...)` literal restante em `src/app + src/components`.

### 2.8 Segurança / Hardening
- `next.config.ts` ganhou `headers()` com CSP, HSTS (prod), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. `poweredByHeader: false`.
- `log-redact.ts` estendido: `redactSensitiveLog` (logs) e `scrubSecretsForLlm` (input do modelo) — cobre phone/email/JWT/sk-*/Bearer/query-secrets.
- Testes em `security-hardening.test.ts`: 1 → 5 cenários cobertos.

### 2.9 Build / Deploy / Infra
- Stack Swarm com Docker secrets externos (5 mandatórios + 7 opcionais comentados).
- `scripts/docker-entrypoint.sh`: carrega `/run/secrets/*` como env vars + templating de `DATABASE_URL` via `@PASSWORD@`.
- `Dockerfile`: `HEALTHCHECK` em `/api/health`, comentário explicando decisão sobre `tsx` em runtime.
- Compose unificado em `pgvector/pgvector:pg16` (paridade com Swarm).
- 3 stacks Swarm com `update_config.order: start-first` (web) / `stop-first` (worker) + `rollback_config` + `healthcheck`.
- GHA: actions pinadas por subversão, `cache-from/to: type=gha`, `:latest` em main, login skip em PR.
- `/api/metrics` (formato Prometheus 0.0.4, atrás de `HEALTH_DETAILS_TOKEN`).

### 2.10 Documentação
- `CHANGELOG.md`: entrada `[Unreleased]` cobrindo Chatwoot/WA Cloud, Meta Ads + Clarity, Vysen runtime, RLS, api-contract, worker refactor, Docker secrets etc.
- `docs/GETTING_STARTED.md`: lista de migrations atualizada (0000–0025), health endpoint dividido, link revisão atualizado.
- `docs/PADRAO_DESENVOLVIMENTO.md`: documenta coexistência de `(admin)` / `(superadmin)` / `(company-admin)`.
- `docs/RESUMO_PROJETO.md`: integrações/observabilidade incluem Chatwoot + WA Cloud.
- `docs/db/MIGRATION_ORDER.md`: reescrito refletindo o journal real (0000–0025).
- `docs/MATRIZ_AUTORIDADE_DOCUMENTAL.md`: aponta `REVISAO_GERAL_2026-05.md` como canônica corrente.
- **6 docs arquivados** em `docs/log/`: 2 planos concluídos, 1 versão antiga de plano F1-F5, 1 revisão de páginas/tabelas, 2 revisões de março 2026 (superseded).
- `docs/log/README.md`: novo bloco "Histórico arquivado" indexando os movidos.
- `package.json`: `bullmq` removido (zero imports — confirmado).

---

## 3. O que ficou deferido (decisão consciente)

Cada um destes tem documentação inline no código explicando o porquê.

| Item | Onde | Motivo |
|---|---|---|
| **Virtualização de leads/conversations** | `dashboard/leads/page.tsx` | `LEADS_LIMIT=200` no server já capa; sem métrica de problema, instalar `@tanstack/react-virtual` é desproporcional. |
| **Compilar worker para JS no builder** | `Dockerfile` | `tsx` está em `dependencies` (não devDeps); imagem `runner` é `--omit=dev`. Compilar via tsc puro não resolve paths aliases; `tsup`/`esbuild` seria refator. Custo atual: ~200 ms a mais de boot. |
| **Particionar `vysen_usage_events` por mês** | `0022_*.sql` | Retention de 90 d cobre o caso comum; particionamento exige `CREATE TABLE ... PARTITION BY RANGE` + cópia de dados (refator grande). Migrar quando volume justificar. |
| **Pin de actions por SHA (em vez de subversão)** | `.github/workflows/docker-image.yml` | Subversões fixas (`@v4.2.2`, `@v3.7.1` etc.) já fecham o vetor mais comum. Pin por SHA fica como hardening adicional se supply-chain virar crítico. |

Nenhum desses é bloqueante para go-live.

---

## 4. Pontos de atenção operacional para deploy

Antes do primeiro `docker stack deploy` com a stack refatorada:

1. **Criar Docker secrets no manager** (uma vez):
   ```
   printf '%s' '<senha>'              | docker secret create postgres_password -
   openssl rand -hex 32 | tr -d '\n'  | docker secret create session_secret -
   openssl rand -hex 32 | tr -d '\n'  | docker secret create config_encryption_key -
   openssl rand -hex 32 | tr -d '\n'  | docker secret create integrations_encryption_key -
   printf '%s' '<senha-admin>'        | docker secret create seed_admin_password -
   ```
2. **Configurar `HEALTH_DETAILS_TOKEN`** se for usar `/api/health/details` ou `/api/metrics` (monitoring/Prometheus).
3. **`SECURITY_ENFORCE_RLS=true` em produção** — confirma RLS opt-in está ligado (startup-guards já barram boot sem isso).
4. **`SECURITY_ENFORCE_CSRF=true` em produção** — idem.
5. **`SECURITY_ALLOW_PLAINTEXT_SECRETS=false`** em produção.
6. **`HEALTH_DETAILS_TOKEN`** rotacionar regularmente (rotation manual; sem fluxo automatizado).
7. **`VYSEN_AGNO_TOKEN`** se habilitar `VYSEN_AGNO_ENABLED=true`, senão deixar ausente (fallback automático para provider local).

---

## 5. Validação final completa

Comando reproduzível:
```
npm run typecheck   # zero erros
npm test            # 9 pass / 0 fail
npm run smoke:web   # ok
npm run smoke:api   # ok
npm run smoke:worker # ok
npm run smoke:channels # ok (depende de DB+Redis locais)
npm run lint        # 0 erros, 46-47 warnings preexistentes
```

CI também roda `npm run ci:verify` (lint + typecheck + test + build + 4 smokes).

---

## 6. Mapa de pontos críticos remanescentes (post-sessão)

Findings que o relatório original tinha mas **não dependem de mudança técnica
nesta camada**:

- **Decisão de produto: `users.email UNIQUE` global vs. multi-tenant.** Mover
  unicidade para `memberships(user_id, tenant_id)` quebra integração com
  bootstrap atual. Fica como decisão de produto antes de white-label.
- **Documento operacional dedicado para Chatwoot e WhatsApp Cloud** (paridade
  com `BASE2_META_ADS` / `BASE2_CLARITY`). Schema e código já em produção;
  falta narrativa.
- **`SUPERADMIN_AREA.md`**: documentar diferenças entre `(admin)` / `(superadmin)` / `(company-admin)`.
- **ADR de transição do envelope API** (`apiOk`/`apiError`) — checklist de
  rotas migradas vs. pendentes.

---

## 7. Métricas da execução

- **Tempo de sessão**: 1 dia (2026-05-22).
- **Commits**: 11 em `origin/main`, todos sequenciais e com push.
- **Diff agregado**: 119 arquivos, +8124 −1730 = **+6394 linhas líquidas**.
- **Migrations adicionadas**: 6 (`0020` → `0025`).
- **Arquivos novos**: ~12 (helpers, endpoints, testes adicionados).
- **Findings tratados**: ~80 (todos os críticos + maioria dos altos).
- **Itens deferidos**: 4 (com justificativa documentada inline).

---

> Para a próxima revisão (`REVISAO_GERAL_2026-XX`), construir por diff sobre
> `REVISAO_GERAL_2026-05.md`. Este documento é o complemento de execução —
> não substitui o original.
