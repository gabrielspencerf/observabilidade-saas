# Base 2 — Dashboard analítico inicial (home)

## 1. Objetivo

Oferecer ao tenant uma visão consolidada da operação e da aquisição na própria home, usando apenas dados já persistidos (leads, conversations, campaign_snapshots). Sem atribuição Ads ↔ leads e sem gráficos complexos; foco em resumos e listas úteis.

---

## 2. Arquivos criados/alterados e responsabilidades

### server/dashboard/analytics.ts (criado)

| Responsabilidade |
|------------------|
| **getAnalyticsSummaryForTenant(tenantId, options?)**: retorna **AnalyticsSummary** com totais (totalLeads, totalConversations, totalGoogleAdsAccounts), **periodDays** (1–365, default 30), **adsPeriodTotals** (spend, clicks, impressions no período), **topCampaignsBySpend** (até 15 campanhas agregadas por conta+campanha, ordenadas por gasto), **recentLeads** (10), **recentConversations** (10). Tudo tenant-scoped. Período aplicado apenas aos dados de Google Ads (campaign_snapshots com period_start >= today - periodDays). |
| **getAdsPeriodTotals(tenantId, periodDays)**: SQL de agregação em campaign_snapshots (soma de cost/costMicros, clicks, impressions) no período. |
| **getTopCampaignsBySpend(tenantId, periodDays)**: SQL com JOIN em google_ads_accounts, GROUP BY conta + campanha, ORDER BY gasto DESC, LIMIT 15. |

### server/dashboard/index.ts (alterado)

| Responsabilidade |
|------------------|
| Exporta **getAnalyticsSummaryForTenant** e tipos **AnalyticsSummary**, **AnalyticsSummaryOptions**, **AnalyticsAdsPeriodTotals**, **AnalyticsTopCampaignRow**. |

### app/(dashboard)/home/page.tsx (alterado)

| Responsabilidade |
|------------------|
| Usa **getAnalyticsSummaryForTenant(tenantId, { periodDays })** em vez de getHomeSummaryForTenant. **searchParams.period**: 7, 30 ou 90 (default 30); links "Últimos 7 dias", "Últimos 30 dias", "Últimos 90 dias" para alterar o período. Cards: totais de leads, conversas, contas Google Ads; gasto, cliques e impressões no período (Ads). Tabela: campanhas com maior gasto no período (nome, conta, gasto, cliques, impressões). Listas: últimos leads e últimas conversas (inalteradas em lógica). Tudo dentro do mesmo layout e DashboardShell. |

---

## 3. Queries principais

- **Totais operacionais:**  
  - `SELECT count(*)::int FROM leads WHERE tenant_id = $1`  
  - `SELECT count(*)::int FROM conversations WHERE tenant_id = $1`  
  - `SELECT count(*)::int FROM google_ads_accounts WHERE tenant_id = $1`

- **Métricas Ads no período (um único row):**  
  `SELECT coalesce(sum(cost/costMicros)), coalesce(sum(clicks)), coalesce(sum(impressions)) FROM campaign_snapshots WHERE tenant_id = $1 AND period_start >= current_date - ($2 * interval '1 day')`  
  (cost derivado de metrics->>'cost' ou metrics->>'costMicros'/1e6.)

- **Top campanhas por gasto:**  
  `SELECT ga.external_id, cs.campaign_name, cs.external_campaign_id, sum(cost), sum(clicks), sum(impressions) FROM campaign_snapshots cs INNER JOIN google_ads_accounts ga ON cs.google_ads_account_id = ga.id WHERE cs.tenant_id = $1 AND cs.period_start >= ... GROUP BY ga.external_id, cs.campaign_name, cs.external_campaign_id, cs.google_ads_account_id ORDER BY sum(cost) DESC LIMIT 15`

- **Leads e conversas recentes:** reutilizam **listLeadsForTenant** e **listConversationsForTenant** (limit 10).

---

## 4. Acesso e escopo

- Tenant sempre resolvido no servidor pela sessão (**getDashboardTenantContext()**).
- Período vem da URL (**period**), validado e limitado (1–365 dias) no servidor.
- Nenhuma chamada a APIs externas na renderização da página; apenas dados do banco.

---

## 5. Navegação

- Visão analítica integrada em **/dashboard/home**; não há rota separada.
- Filtro de período por links (7 / 30 / 90 dias) acima dos cards; afeta apenas métricas Ads e tabela de campanhas.
- DashboardShell e links para Leads, Conversas e Google Ads mantidos.

---

## 6. Limitações desta primeira versão

- Sem atribuição Ads ↔ leads; totais de Ads e de leads/conversas são independentes.
- Sem gráficos (evolução no tempo, tendências).
- Gasto exibido sem moeda (valor numérico); moeda por conta pode ser adicionada depois.
- Período só altera métricas de Google Ads e top campanhas; "últimos leads" e "últimas conversas" continuam por recência (last_seen / last_synced), não filtrados pelo mesmo período.
- Top campanhas limitado a 15 linhas; sem paginação.
