# Revisão: acesso às rotas e RBAC

Checklist pós-mudanças para garantir que a superfície de ataque permaneça consistente.

## Middleware (`src/middleware.ts`)

- Garante apenas a **presença** do cookie de sessão em `/dashboard/*` e `/admin/*`.
- **Não** valida usuário, tenant nem permissões — isso deve ocorrer em Server Components, layouts e handlers de API.

## Onde a validação real deve existir

| Área | Mecanismo esperado |
|------|--------------------|
| Dashboard | `getCurrentSession` + `getMembershipsForUser` no layout `(dashboard)`; APIs com `requireAuth` e `currentTenantId`. |
| Admin | `getCurrentSession` + `hasPermission(..., ADMIN_ACCESS)` no layout `(admin)`. |
| APIs `/api/dashboard/*` | `requireAuth` e escopo por `session.currentTenantId` (ou equivalente). |
| APIs `/api/admin/*` | Autenticação admin + checagens específicas por rota. |

Em uma revisão de código, vale varrer novas rotas em `src/app/api/**` e confirmar que não há leitura/escrita de dados de tenant sem amarrar ao tenant da sessão.

## RBAC no dashboard

Conforme [PADRAO_DESENVOLVIMENTO.md](./PADRAO_DESENVOLVIMENTO.md):

- **Implementado:** área admin protegida por `admin:access` (super_admin).
- **APIs `/api/dashboard/*`:** usam `requireDashboardApiAuth` com slugs (`dashboard:read`, `leads:read`/`leads:write`, `funnels:read`/`funnels:write`) conforme a rota. Ver `src/server/dashboard/api-auth.ts` e `src/server/rbac/permissions.ts`.
- **Layout `(dashboard)`:** com tenant selecionado, exige `dashboard:read` no tenant atual; sem tenant (ex.: escolha em `/dashboard/context`) só exige sessão + alguma membership.
- **POST `/api/context/tenant`:** com tenant já selecionado na sessão, exige `tenant:switch` para trocar; na primeira escolha (sem tenant atual) não exige essa permissão.
- **UI (sidebar / ocultar telas):** ainda não filtra por permissão; usuário sem acesso a uma área pode ver o link e receber 403 na API. Evolução: esconder itens com `hasPermission` no shell.

**Roles de tenant (após migration `0017_tenant_role_permissions` ou seed Base 1 atualizado):** `viewer` (leitura + troca de tenant), `operator` (+ escrita leads/funis), `admin_tenant` (todas exceto `admin:access`), `super_admin` (todas).

## Telemetria de depuração opcional

- `AGENT_DEBUG_INGEST_URL` em [.env.example](../.env.example): quando **não** definida, `agentDebugLog()` não envia requisições (comportamento seguro em produção).
