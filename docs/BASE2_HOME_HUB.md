# Base 2 — Hub operacional (dashboard home)

## 1. Objetivo

Transformar `/dashboard/home` em hub operacional mínimo útil por tenant: visão inicial do que está acontecendo no tenant atual com dados já existentes de leads e conversas, sem dashboard analítica (sem gráficos). Ponto central para navegar para Leads e Conversas.

---

## 2. Arquivos criados/alterados e responsabilidades

### server/dashboard/home.ts (novo)

| Responsabilidade |
|------------------|
| `getHomeSummaryForTenant(tenantId)`. Retorna `HomeSummary`: totais (totalLeads, totalConversations) e listas recentes (recentLeads, recentConversations). Executa em paralelo: count em `leads` e em `conversations` (WHERE tenant_id), `listLeadsForTenant(tenantId, { limit: 10 })`, `listConversationsForTenant(tenantId, { limit: 10 })`. Sempre filtrado por tenant_id. |

### server/dashboard/index.ts (alterado)

| Responsabilidade |
|------------------|
| Exporta `getHomeSummaryForTenant` e tipo `HomeSummary`. |

### app/(dashboard)/home/page.tsx (alterado)

| Responsabilidade |
|------------------|
| Chama `getDashboardTenantContext()` e `getHomeSummaryForTenant(tenantId)`. Renderiza: título e descrição; dois cards clicáveis (total de leads, total de conversas) com links para `/dashboard/leads` e `/dashboard/conversations`; duas colunas: "Últimos leads" (lista com link para detalhe + lastSeenAt) e "Últimas conversas" (lista com link para detalhe + instanceDisplay, messageCount, data). Cada bloco tem "Ver todos" para a listagem completa. |

---

## 3. Queries principais

- **Total leads:** `SELECT count(*)::int FROM leads WHERE tenant_id = $1`
- **Total conversas:** `SELECT count(*)::int FROM conversations WHERE tenant_id = $1`
- **Últimos leads:** Reutiliza `listLeadsForTenant(tenantId, { limit: 10 })` (SELECT ... FROM leads WHERE tenant_id ORDER BY last_seen_at DESC LIMIT 10).
- **Últimas conversas:** Reutiliza `listConversationsForTenant(tenantId, { limit: 10 })` (conversations + evolution_instances + contagem de mensagens, ORDER BY last_synced_at DESC, started_at DESC LIMIT 10).

---

## 4. Acesso e escopo

- **Tenant:** Sempre da sessão via `getDashboardTenantContext()`; nunca do frontend.
- **Dados:** Todas as queries filtradas pelo tenant atual (counts e listas).

---

## 5. Navegação

- **DashboardShell:** Mantido; home continua com o mesmo header (Início, Leads, Conversas, Admin, tenant, Sair).
- **Home como hub:** Cards de totais levam a Leads e Conversas; listas "Últimos leads" e "Últimas conversas" com links para as páginas de detalhe; "Ver todos" para as listagens completas.

---

## 6. Limitações desta primeira versão

- **Sem gráficos:** Apenas números e listas; sem charts, KPIs ou tendências.
- **Limite fixo:** "Recentes" = 10 itens (constante RECENT_LIMIT).
- **Sem filtros:** Não há filtro por período ou status na home.
- **Sem métricas derivadas:** Não exibe "leads esta semana", "conversas abertas", etc.

---

## 7. Resumo

- **Rota:** `/dashboard/home` — hub com totais (leads, conversas), últimos leads e últimas conversas, todos com links para listagens e detalhes.
- **Dados:** `getHomeSummaryForTenant(tenantId)` com 4 fontes em paralelo (2 counts + 2 listas).
- **Foco:** Utilidade operacional imediata; ponto central para navegação.
