# Security Endpoints Map

Mapa de superfícies críticas para rollout de segurança.

## 1) Auth e sessão

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `POST /api/context/tenant`

## 2) Admin mutável (cookie auth + permissão)

- `POST /api/admin/integrations/*`
- `PATCH /api/admin/integrations/*`
- `DELETE /api/admin/integrations/*`
- `POST /api/admin/tenants`
- `PATCH /api/admin/tenants/[id]`
- `POST /api/admin/users`
- `POST /api/admin/memberships`

## 3) Dashboard mutável (cookie auth + tenant atual)

- `POST /api/dashboard/*` que cria/edita/deleta entidades
- Principais: leads import/export/patch, opportunities patch, funnels CRUD, products create, complaints create, tenant-assets upload/delete, notifications patch.

### 3.1) Integrações de mensagens (tenant — leitura / reconexão)

- `GET /api/dashboard/integrations/messaging` — lista instâncias Evolution/UAZAPI do tenant (sem segredos).
- `GET /api/dashboard/integrations/messaging/[instanceId]/status` — status amigável no JSON (`userMessage` em falha; sem vazar corpo bruto do provedor).
- `POST /api/dashboard/integrations/messaging/[instanceId]/connect` — obtém QR / reconexão; rate limit por usuário; respostas de erro com `userMessage`.

> A página admin **`/admin/worker-pipeline`** é apenas RSC (super_admin); não expõe API REST própria além do que o layout admin já protege.

## 4) Webhooks públicos

- `POST /api/webhooks/typebot/[botId]`
- `POST /api/webhooks/evolution/[instanceId]`
- `POST /api/webhooks/uazapi/[instanceId]`

## 5) Controles por camada

- CSRF token: rotas mutáveis autenticadas por cookie.
- RLS context: `tenant_id` por request no servidor.
- Open redirect guard: login + OAuth.
- Anti-replay webhook: marcador de evento com TTL.
- Rate limit: buckets por rota sensível + IP confiável via proxy.
