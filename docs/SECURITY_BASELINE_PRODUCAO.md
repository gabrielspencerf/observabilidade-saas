# Security Baseline de produção

Objetivo: eliminar drift entre ambientes e bloquear deploy com configuração insegura.

## Guardrails implementados

- `src/server/security/startup-guards.ts`
  - `assertProductionSecurityBaseline()` exige em produção:
    - `SECURITY_ENFORCE_RLS=true`
    - `SECURITY_ENFORCE_CSRF=true`
    - `SECURITY_ALLOW_PLAINTEXT_SECRETS` desligado
- `src/instrumentation.ts`
  - Baseline é validado na inicialização Node do app.
- `src/workers/runner.ts`
  - Worker continua validando segredo de webhook (`META_APP_SECRET`) em produção.

## Critério de aceite por ambiente

### Produção
- RLS habilitado.
- CSRF habilitado.
- Segredos em plaintext desabilitados.
- Worker com segredo HMAC obrigatório para WhatsApp Cloud.

### Staging
- Recomendado igual produção.
- Exceções temporárias precisam de issue de prazo e responsável.

### Desenvolvimento local
- Pode flexibilizar para facilitar bootstrap.
- Não transportar essas exceções para ambiente real.

## Checklist de deploy

1. Validar variáveis de segurança no ambiente alvo.
2. Executar `npm run ci:verify`.
3. Confirmar saúde de app + worker em `/api/health`.
4. Testar mutação autenticada (CSRF) e acesso multi-tenant (RLS).
