# Security Acceptance Checklist

Checklist objetivo para validar rollout das melhorias de segurança.

## Flags e rollout

- [ ] `SECURITY_ENFORCE_RLS` definido conforme ambiente.
- [ ] `SECURITY_ENFORCE_CSRF` definido conforme ambiente.
- [ ] `SECURITY_STRICT_REDIRECTS` habilitado.
- [ ] `SECURITY_ALLOW_PLAINTEXT_SECRETS=false` fora de dev local.

## Banco e RLS

- [ ] Migration `0016_security_rls_tenant_policies.sql` aplicada.
- [ ] Migration `0017_tenant_role_permissions.sql` aplicada (mapeamento viewer/operator/admin_tenant).
- [ ] `app.current_tenant_id` é definido por request autenticada.
- [ ] Admin global usa bypass explícito (`app.bypass_rls=on`) apenas quando necessário.
- [ ] `WORKER_DB_ACCESS_MODE` definido por ambiente (`bypass` no rollout inicial de RLS).
- [ ] Worker aplica contexto de acesso por job (`setDbAccessContext`/`resetDbAccessContext`) em `src/workers/runner.ts`.
- [ ] Jobs globais do worker (sync por `accountId`/`connectionId`) seguem operacionais com fallback controlado.

## Rollout por ambiente (RLS)

- [ ] **Dev:** `SECURITY_ENFORCE_RLS=true` + `WORKER_DB_ACCESS_MODE=bypass` com smokes e `typecheck` verdes.
- [ ] **Dev:** `npm run smoke:channels` verde com Postgres + Redis locais.
- [ ] **Staging:** repetir flags e validar health/admin observability + processamento de filas reais.
- [ ] **Prod (janela controlada):** ligar RLS fora de pico com monitoramento de DLQ e `processing_failures`.
- [ ] Critério de rollback definido: aumento anormal de DLQ/falhas de sync/auth após ligar RLS.

## Go/No-Go de staging (RLS)

- [ ] Janela de observação em staging definida (mínimo: 30 minutos após ativação).
- [ ] `/api/health` em `ok` durante a janela.
- [ ] DLQ sem crescimento anormal na janela (comparado ao baseline pré-ativação).
- [ ] `processing_failures` sem pico regressivo para jobs de sync/followup/classificação.
- [ ] Evidências registradas em `docs/log/REGISTRO.md` com timestamps e comandos usados.
- [ ] Decisão explícita de **go/no-go** para produção registrada.

## Protocolo de coleta (staging RLS 30min)

- [ ] **T0 (ativação):** registrar timestamp, flags aplicadas e restart de app/worker.
- [ ] **T0:** coletar `GET /api/health` (incluindo `workerHeartbeatAgeMs` e `workerLastHeartbeatAt`).
- [ ] **T0:** registrar baseline de filas/DLQ na Observability (queue total + dlq total).
- [ ] **T0:** registrar baseline de `processing_failures` (últimos 30 min).
- [ ] **T+15min:** repetir health + filas/DLQ + `processing_failures`.
- [ ] **T+30min:** repetir health + filas/DLQ + `processing_failures`.
- [ ] Critério de sucesso aplicado e decisão final registrada (go/no-go).

## Critério objetivo da janela (staging)

- [ ] **Falha imediata:** `GET /api/health` retorna 503 em qualquer coleta.
- [ ] **Falha:** `worker` diferente de `ok` em 2 coletas consecutivas.
- [ ] **Falha:** DLQ cresce continuamente de T0 até T+30 sem estabilização.
- [ ] **Falha:** `processing_failures` mostra recorrência regressiva do mesmo `jobType`.

## CSRF

- [ ] Login/OAuth setam cookie `csrf_token`.
- [ ] Mutações autenticadas por cookie rejeitam request sem `x-csrf-token` quando `SECURITY_ENFORCE_CSRF=true`.
- [ ] Frontend envia automaticamente `x-csrf-token` em `fetch` same-origin mutável.

## Redirects

- [ ] `from` em login/OAuth é sanitizado para paths internos permitidos.
- [ ] URLs externas e `//host` são rejeitadas.

## Webhooks

- [ ] Typebot/Evolution/UAZAPI com rate-limit ativo.
- [ ] Chatwoot com `x-chatwoot-signature` validado quando `api_token_encrypted` estiver configurado.
- [ ] WhatsApp Cloud com `X-Hub-Signature-256` validado via `META_APP_SECRET` em staging/prod.
- [ ] WhatsApp Cloud GET de hub verification validado no cadastro do número.
- [ ] Anti-replay com TTL ativo (mesmo evento rejeitado em janela curta).
- [ ] Assinatura/HMAC validada conforme integração.

## Rate-limit e proxy

- [ ] `RATE_LIMIT_TRUSTED_PROXY_HOPS` validado em produção.
- [ ] Proxy sobrescreve `X-Forwarded-For` e `X-Real-IP`.

## Higiene operacional

- [ ] Cleanup periódico de `sessions` e `password_reset_tokens` expirados ativo no worker.
- [ ] Sem logs de segredos/tokens em claro.

## Verificação técnica

- [ ] `npm run typecheck` OK.
- [ ] `npm run lint` sem erros (warnings conhecidos mapeados).
- [ ] `npm run build` OK.
- [ ] `npm run smoke:channels` OK.
