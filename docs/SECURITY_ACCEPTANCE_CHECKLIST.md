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

## CSRF

- [ ] Login/OAuth setam cookie `csrf_token`.
- [ ] Mutações autenticadas por cookie rejeitam request sem `x-csrf-token` quando `SECURITY_ENFORCE_CSRF=true`.
- [ ] Frontend envia automaticamente `x-csrf-token` em `fetch` same-origin mutável.

## Redirects

- [ ] `from` em login/OAuth é sanitizado para paths internos permitidos.
- [ ] URLs externas e `//host` são rejeitadas.

## Webhooks

- [ ] Typebot/Evolution/UAZAPI com rate-limit ativo.
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
