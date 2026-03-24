# Revisão de Segurança e Banco de Dados (Auditoria)

> **Atualização (repositório):** o código passou a incluir **RLS com rollout** (`src/db/migrations/0016_security_rls_tenant_policies.sql` + `SECURITY_ENFORCE_RLS`), **CSRF opcional** (`SECURITY_ENFORCE_CSRF`, validação em `requireAuth`, suporte a `csrf_token` em FormData), **redirects OAuth** com política `SECURITY_STRICT_REDIRECTS` via `src/server/security/redirect-policy.ts`, **anti-replay em webhooks** (Redis) e **RBAC em APIs do dashboard** (`requireDashboardApiAuth`, migration `0017_tenant_role_permissions`). Os achados abaixo mantêm valor histórico onde ainda há risco residual (ex.: UI sem ocultar menu por permissão).

Documento de auditoria (sem mudanças de código) focado em:
1) sessão/auth/cookies e redirecionamentos, 2) isolamento multi-tenant e RBAC, 3) integridade de webhooks/OAuth, 4) segredos criptografados, 5) banco de dados (constraints, índices e RLS real vs “tenant_id para RLS”), 6) riscos operacionais/DoS.

> Importante: este relatório assume o estado atual do repositório. Quando alguma evidência não estiver disponível (ex.: RLS aplicado via infra fora do repo), o item fica como “dependência externa”.

---

## Sumário Executivo

- **Isolamento multi-tenant:** continua dependendo do app (`tenant_id` + `setDbAccessContext`); **RLS existe no repo** e pode ser ligada com `SECURITY_ENFORCE_RLS=true` após aplicar a migration 0016. Até lá, a camada de aplicação permanece crítica.
- **Redirects:** login (cliente) usa whitelist; fluxos OAuth no servidor usam `sanitizeOAuthRedirect` + flag `SECURITY_STRICT_REDIRECTS` (default estrito se a variável estiver omitida — ver `src/config/env.ts`).
- **CSRF:** tokens opcionais por env; mutações que usam `requireAuth` validam header ou campo `csrf_token` em formulários. Rotas que não passam por `requireAuth` precisam ser mantidas sob revisão.
- **Rate limit / webhooks / replay:** IP ainda depende do proxy; webhooks passaram a ter anti-replay com TTL (ver rotas em `src/app/api/webhooks/` e checklist em `docs/SECURITY_ACCEPTANCE_CHECKLIST.md`).

---

## Achados de Segurança (com severidade e evidência)

### Alto — Isolamento multi-tenant: RLS em rollout (não substitui disciplina no app)

**Evidências (atual)**
- Migration `0016_security_rls_tenant_policies.sql`: habilita RLS em tabelas `public` com coluna `tenant_id` (exceto `memberships`), com política condicionada a GUCs `app.current_tenant_id`, `app.bypass_rls`, `app.enforce_rls`.
- Contexto por request: `src/server/db/access-context.ts` + uso em auth/admin/webhooks.
- Comentários em schemas do Drizzle indicando “`tenant_id` para RLS”, por exemplo em:
  - `[src/db/schema/integrations/typebot-bots.ts](src/db/schema/integrations/typebot-bots.ts)`
  - `[src/db/schema/integrations/evolution-instances.ts](src/db/schema/integrations/evolution-instances.ts)`
  - `[src/db/schema/integrations/google-ads-accounts.ts](src/db/schema/integrations/google-ads-accounts.ts)`
  - `[src/db/schema/integrations/uazapi-instances.ts](src/db/schema/integrations/uazapi-instances.ts)`
- O isolamento no app ocorre principalmente por validação de tenant via sessão/membership e por consultas com `tenantId`, por exemplo no contexto:
  - `[src/server/dashboard/context.ts](src/server/dashboard/context.ts)` (usa `getCurrentSession` + `getCurrentMembership`)
- As APIs de dashboard usam `session.session.currentTenantId` e retornam erro quando ausente (exemplos):
  - `[src/app/api/dashboard/pagespeed/fetch/route.ts](src/app/api/dashboard/pagespeed/fetch/route.ts)`
  - `[src/app/api/dashboard/notifications/route.ts](src/app/api/dashboard/notifications/route.ts)`
  - (padrão transversal: ver uso de `session.session.currentTenantId` em `src/app/api/dashboard/*`)

**Impacto**
- Se um endpoint novo/alterado esquecer o filtro por tenant (ou usar query “global” sem amarrar `tenant_id`), há risco de vazamento entre tenants.

**Recomendação**
- Aplicar migration 0016 e validar rollout com `SECURITY_ENFORCE_RLS` em staging antes de produção.
- Manter revisão de PR para queries sem filtro de tenant mesmo com RLS ligado (defesa em profundidade).

---

### Médio — Open redirect via `from` (login e OAuth)

**Evidências**
- Login (cliente):
  - `[src/app/login/page.tsx](src/app/login/page.tsx)` usa `searchParams.get("from")` e faz `router.push(from)` sem whitelist.
- OAuth Google (state assinado, mas redirect alvo controlável indiretamente):
  - `[src/app/api/auth/google/start/route.ts](src/app/api/auth/google/start/route.ts)` recebe `from` via query e inclui no state.
  - `[src/app/api/auth/google/callback/route.ts](src/app/api/auth/google/callback/route.ts)` redireciona para `from` (quando não é fluxo admin), sem validação de “é rota interna”.

**Cenário**
- Um atacante pode iniciar o fluxo OAuth com um `from` externo (via URL de start). Embora o state seja assinado, o conteúdo assinado ainda pode carregar o destino indesejado.

**Recomendação (sem implementação)**
- Introduzir whitelist de destinos permitidos (ex.: apenas caminhos relativos começando com `/dashboard` ou `/admin`), e rejeitar `http(s)://` e `//host`.

---

### Médio — CSRF (mitigação parcial por flag)

**Evidências**
- `[src/server/security/csrf.ts](src/server/security/csrf.ts)` + cookie `csrf_token`; `requireAuth` valida em métodos mutáveis quando `SECURITY_ENFORCE_CSRF=true` (header `x-csrf-token` ou campo `csrf_token` em `multipart`/`urlencoded`).
- Cliente: `[src/components/security/csrf-fetch-bootstrap.tsx](src/components/security/csrf-fetch-bootstrap.tsx)` anexa header em `fetch` same-origin.
- Formulários HTML nativos que fazem POST (ex.: Google Ads) incluem `csrf_token` oculto preenchido no servidor a partir do cookie.

**Residual**
- Qualquer rota mutável que autentique sem `requireAuth` não herda a checagem até ser alinhada.

**Recomendação**
- Habilitar `SECURITY_ENFORCE_CSRF` em produção após testes e auditar `/api/**` mutáveis.

---

### Médio — Rate limiting com IP baseado em headers (dependência forte do proxy)

**Evidências**
- IP é extraído de `x-forwarded-for` ou `x-real-ip`:
  - `[src/server/security/rate-limit.ts](src/server/security/rate-limit.ts)`
- A chave de rate limit inclui `hashKeyPart(ip)`:
  - `ratelimit:${bucket}:${hashKeyPart(ip)}:${resource}`

**Risco**
- Se o proxy (NGINX/Traefik) não sobrescreve esses headers, o cliente pode “fingir IP” e contornar o rate limit.

**Recomendação (sem implementação)**
- Garantir que o proxy normalize/escreva `x-real-ip`/`x-forwarded-for` de forma confiável.
- Considerar usar IP do socket/`request.ip` quando disponível na plataforma (ou validar confiança do header).

---

### Médio — Webhooks: replay (estado atual)

**Evidências**
- `checkWebhookReplay` (Redis, TTL curto) nas rotas Typebot/Evolution/UAZAPI.
- Validações de assinatura/secret por provider (ver `src/server/integrations/*` e `webhook-signature`).

**Residual**
- Idempotência por `external_event_id` por negócio (quando aplicável) continua recomendada além da janela anti-replay.

---

### Médio — Fallback para segredos em plaintext quando chave de criptografia falha (risco operacional)

**Evidências**
- `[src/server/security/secret-storage.ts](src/server/security/secret-storage.ts)`:
  - permite fallback para plaintext **quando `NODE_ENV !== "production"`** e há erro de configuração de chave (INTEGRATIONS_ENCRYPTION_KEY/CONFIG_ENCRYPTION_KEY).

**Risco**
- Se `NODE_ENV` estiver incorreto em algum ambiente (ex.: staging/CI com `NODE_ENV=production` falsamente ou erro de config), o comportamento pode causar persistência não criptografada.

**Recomendação (sem implementação)**
- Garantir que a pipeline/provisionamento define `NODE_ENV` corretamente.
- Considerar fail-fast mais estrito em ambientes além de local/dev (política organizacional).

---

## Banco de Dados: auditoria (constraints, índices, isolamento e limpeza)

### Observação — Constraints e índices por `tenant_id` existem e ajudam a integridade

**Evidências**
- `leads` tem FK `tenantId -> tenants.id` com `onDelete: "cascade"` e índices/unique parcial:
  - `[src/db/schema/funnels-leads/leads.ts](src/db/schema/funnels-leads/leads.ts)`
- `conversations` tem FK `tenantId -> tenants.id` e FKs de integração com `onDelete` adequado:
  - `[src/db/schema/conversations/conversations.ts](src/db/schema/conversations/conversations.ts)`
- `memberships` garante unicidade por `(userId, tenantId)`:
  - `[src/db/schema/auth/memberships.ts](src/db/schema/auth/memberships.ts)`

**Impacto positivo**
- Mesmo sem RLS, as FKs reduzem inconsistência referencial e criam “rails” para manter `tenant_id` coerente.

---

### Risco — Limpeza de sessões expirada pode depender apenas do acesso (crescimento do banco)

**Evidência**
- `getSessionFromCookie` valida `expiresAt > now` e ignora sessões expiradas:
  - `[src/server/auth/session.ts](src/server/auth/session.ts)`
- Não foi localizado no repo (via busca) um job/worker de cleanup para deletar sessões expiradas proativamente.

**Impacto**
- Banco pode crescer com registros expirados, aumentando custo de manutenção e eventualmente impactando queries (mesmo que elas filtrem por token hash e expirados).

**Recomendação (sem implementação)**
- Definir job de cleanup periódico: `DELETE FROM sessions WHERE expires_at < now()`.
- Analogamente para tabelas de tokens (ex.: `password_reset_tokens`) se não houver cleanup.

---

## Conclusão: status de risco para aceite

Recomendação de priorização:
1. Rollout de `SECURITY_ENFORCE_RLS` + migration 0016 (e 0017 para mapeamento de roles) em cada ambiente.
2. Manter redirects sanitizados; revisar novos fluxos OAuth.
3. Rollout de `SECURITY_ENFORCE_CSRF` e auditoria de rotas mutáveis.
4. Idempotência por evento nos webhooks onde o provider expõe ID estável.
5. Ajustar rate limit / `RATE_LIMIT_TRUSTED_PROXY_HOPS` ao proxy real.
6. Política de criptografia + cleanup de sessões/tokens (ver worker/checklist).

--- 

## Checklist rápido (para revalidação futura)

- [ ] Migration 0016 aplicada e `SECURITY_ENFORCE_RLS` alinhado ao ambiente?
- [ ] Nenhum redirect usa `from` sem whitelist de destinos internos?
- [ ] Rotas mutáveis têm proteção CSRF definida?
- [ ] Webhooks têm dedup/replay protection adequada (por ID estável ou hash com TTL)?
- [ ] Rate limit não é contornável por headers não confiáveis?
- [ ] Há cleanup periódico para sessões e tokens?

