# Base 2 — Telas operacionais mínimas (Leads e Conversas)

## 1. Objetivo

Criar as primeiras páginas operacionais úteis por tenant, usando dados já persistidos de leads e conversas, sem dashboard analítica. Acesso e escopo sempre pelo tenant atual da sessão; nenhuma confiança em tenant vindo do frontend.

---

## 2. Arquivos criados/alterados e responsabilidades

### server/dashboard/context.ts (novo)

| Responsabilidade |
|------------------|
| `getDashboardTenantContext()`. Obtém sessão via cookie, valida `currentTenantId`, chama `getCurrentMembership(userId, currentTenantId)`. Redireciona para `/login` se não autenticado, para `/dashboard/context` se sem tenant ou sem membership. Retorna `{ session, currentMembership, tenantId, showAdminLink }`. |

### server/dashboard/leads.ts (novo)

| Responsabilidade |
|------------------|
| `listLeadsForTenant(tenantId, options?)`. Lista leads do tenant. Opções: `search` (busca em name, email, phone com ILIKE), `limit` (padrão 200). Ordenação: `last_seen_at` desc. Retorna `LeadRow[]`: id, name, email, phone, status, sourceProvider, firstSeenAt, lastSeenAt. |

### server/dashboard/conversations.ts (novo)

| Responsabilidade |
|------------------|
| `listConversationsForTenant(tenantId, options?)`. Lista conversas do tenant com join em `evolution_instances` para exibir instância (instance_name ou external_id). Segunda query para contagem de mensagens por conversa. Ordenação: `last_synced_at` desc, `started_at` desc. Opção `limit` (padrão 200). Retorna `ConversationRow[]`: id, externalId, status, startedAt, lastSyncedAt, instanceDisplay, messageCount. |

### server/dashboard/index.ts (novo)

| Responsabilidade |
|------------------|
| Re-exporta contexto, listagens e tipos. |

### components/dashboard-shell.tsx (novo)

| Responsabilidade |
|------------------|
| `DashboardShell`. Header com: link Admin (condicional), nav (Início, Leads, Conversas), TenantSwitcher, e-mail do usuário, botão Sair. Recebe `session`, `currentMembership`, `showAdminLink`, `children`. |

### app/(dashboard)/home/layout.tsx (alterado)

| Responsabilidade |
|------------------|
| Chama `getDashboardTenantContext()` e renderiza `DashboardShell` + children. Remove duplicação do header; passa a usar shell compartilhado. |

### app/(dashboard)/home/page.tsx (alterado)

| Responsabilidade |
|------------------|
| Hub mínimo: título, texto e links para Leads e Conversas. |

### app/(dashboard)/leads/layout.tsx (novo)

| Responsabilidade |
|------------------|
| Chama `getDashboardTenantContext()`; redireciona se sem tenant; renderiza `DashboardShell` + children. |

### app/(dashboard)/leads/page.tsx (novo)

| Responsabilidade |
|------------------|
| Chama `getDashboardTenantContext()` e `listLeadsForTenant(tenantId, { search: searchParams.search })`. Formulário GET com campo de busca (nome, e-mail ou telefone). Tabela com colunas: Nome, E-mail, Telefone, Status, Origem (source_provider), Primeiro contato (first_seen_at), Último contato (last_seen_at). Datas formatadas pt-BR. |

### app/(dashboard)/conversations/layout.tsx (novo)

| Responsabilidade |
|------------------|
| Idem ao layout de leads: contexto tenant + `DashboardShell` + children. |

### app/(dashboard)/conversations/page.tsx (novo)

| Responsabilidade |
|------------------|
| Chama `getDashboardTenantContext()` e `listConversationsForTenant(tenantId)`. Tabela com colunas: Identificador (external_id), Instância (instance_name ou external_id da instância), Status, Mensagens (contagem), Início (started_at), Última sincronia (last_synced_at). Sem filtro/busca nesta versão. |

---

## 3. Queries usadas

### Leads

- **Tabela:** `leads`
- **Where:** `tenant_id = $tenantId`. Se `search` informado: e `(name ILIKE %term% OR email ILIKE %term% OR phone ILIKE %term%)`
- **Order:** `last_seen_at DESC`
- **Limit:** 200 (configurável)
- **Colunas selecionadas:** id, name, email, phone, status, source_provider, first_seen_at, last_seen_at

### Conversas

- **Query 1:** `conversations` INNER JOIN `evolution_instances` ON `conversations.evolution_instance_id = evolution_instances.id`, WHERE `conversations.tenant_id = $tenantId`, ORDER BY `last_synced_at DESC`, `started_at DESC`, LIMIT 200. Colunas: id, external_id, status, started_at, last_synced_at, instance_name, instance_external_id (para montar `instanceDisplay`).
- **Query 2:** `conversation_messages` WHERE `tenant_id = $tenantId`, GROUP BY `conversation_id`, SELECT `conversation_id`, count(*) para preencher `messageCount` por conversa.

---

## 4. Acesso e escopo

- **Tenant:** Sempre o da sessão (`session.session.currentTenantId`). Resolvido no servidor em cada layout/página via `getDashboardTenantContext()`.
- **Proteção:** Layout do dashboard já exige sessão e pelo menos um membership. Layouts de home, leads e conversations exigem tenant atual e membership nesse tenant; caso contrário redirecionam para `/dashboard/context`.
- **RBAC:** Não há permissão específica para “ver leads” ou “ver conversas”; qualquer usuário com membership no tenant acessa. Admin continua protegido por `admin:access` (link só para super_admin).

---

## 5. Navegação

- **Header (DashboardShell):** Início (`/dashboard/home`), Leads (`/dashboard/leads`), Conversas (`/dashboard/conversations`), Admin (se super_admin), troca de tenant, e-mail, Sair.
- **Hub (/dashboard/home):** Links para Leads e Conversas.

---

## 6. Limitações desta primeira versão

- **Leads:** Apenas listagem; sem página de detalhe, sem edição, sem paginação (limit fixo 200). Busca simples por nome/e-mail/telefone.
- **Conversas:** Apenas listagem; sem página de detalhe, sem listagem de mensagens, sem paginação (limit 200). Sem filtro por status ou instância.
- **Sem dashboard analítica:** Sem gráficos, KPIs ou métricas.
- **Sem deep link por tenant:** URLs não incluem tenant; o tenant é sempre o da sessão.
- **Contagem de mensagens:** Obtida em query separada (agregação por conversation_id); suficiente para listagem.

---

## 7. Resumo

- **Rotas:** `/dashboard/home` (hub), `/dashboard/leads` (listagem + busca), `/dashboard/conversations` (listagem + contagem de mensagens).
- **Dados:** Sempre tenant da sessão; queries server-side em `listLeadsForTenant` e `listConversationsForTenant`.
- **Shell:** Header único (DashboardShell) com nav e troca de tenant em home, leads e conversations.
- **Próximos passos possíveis:** Página de detalhe de lead, página de detalhe de conversa com mensagens, paginação, filtros adicionais, permissões granulares.
