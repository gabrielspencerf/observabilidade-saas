# Base 2 — Google Ads: Superfície mínima no dashboard

## 1. Objetivo

Expor os dados mínimos do Google Ads já persistidos no sistema: contas conectadas e snapshots de campanha. Sem dashboard analítica completa e sem atribuição avançada Ads ↔ leads. Foco em visibilidade operacional da integração.

---

## 2. Arquivos criados/alterados e responsabilidades

### server/dashboard/google-ads.ts (criado/alterado)

| Responsabilidade |
|------------------|
| **listGoogleAdsAccountsForTenant(tenantId)**: lista contas do tenant (id, externalId, label, lastSyncedAt, lastSyncError); sem tokens. |
| **listCampaignSnapshotsForTenant(tenantId, options?)**: lista snapshots com join em `google_ads_accounts` para obter `accountExternalId`; options: `accountId`, `limit` (default 500). Mapeia `metrics` (JSONB) para impressions, clicks, cost (incluindo costMicros/1e6). |

### server/dashboard/index.ts (alterado)

| Responsabilidade |
|------------------|
| Exporta `listGoogleAdsAccountsForTenant`, `listCampaignSnapshotsForTenant` e tipos `GoogleAdsAccountRow`, `CampaignSnapshotRow`, `ListCampaignSnapshotsOptions`. |

### server/dashboard/home.ts (alterado)

| Responsabilidade |
|------------------|
| Inclui contagem de contas Google Ads do tenant (`totalGoogleAdsAccounts`) no resumo da home, via query em `google_ads_accounts`. |

### app/(dashboard)/google-ads/layout.tsx (criado)

| Responsabilidade |
|------------------|
| Usa `getDashboardTenantContext()` e `DashboardShell`; mesmo padrão de leads e conversations. |

### app/(dashboard)/google-ads/page.tsx (criado)

| Responsabilidade |
|------------------|
| Duas seções: (1) Contas conectadas — tabela com external_id, label, last_synced_at, last_sync_error e formulário POST para sync manual por conta; (2) Métricas por campanha — tabela com campanha, período, impressions, clicks, cost. Exibe mensagem de sucesso quando `searchParams.sync === 'enqueued'`. |

### app/api/google-ads/sync/[accountId]/route.ts (alterado)

| Responsabilidade |
|------------------|
| Em sucesso (sync enfileirado), em vez de retornar JSON 202, faz redirect 302 para `/dashboard/google-ads?sync=enqueued` para feedback na própria página. |

### components/dashboard-shell.tsx (alterado)

| Responsabilidade |
|------------------|
| Link "Google Ads" no nav para `/dashboard/google-ads`. |

### app/(dashboard)/home/page.tsx (alterado)

| Responsabilidade |
|------------------|
| Card "Google Ads" no grid da home com `summary.totalGoogleAdsAccounts` e link para `/dashboard/google-ads`. |

---

## 3. Queries principais

- **Contas do tenant**  
  `SELECT id, external_id, label, last_synced_at, last_sync_error FROM google_ads_accounts WHERE tenant_id = $tenantId ORDER BY last_synced_at DESC`

- **Snapshots do tenant**  
  `SELECT cs.id, cs.google_ads_account_id, ga.external_id AS account_external_id, cs.campaign_name, cs.external_campaign_id, cs.period_start, cs.period_end, cs.metrics, cs.synced_at FROM campaign_snapshots cs INNER JOIN google_ads_accounts ga ON cs.google_ads_account_id = ga.id WHERE cs.tenant_id = $tenantId [AND cs.google_ads_account_id = $accountId] ORDER BY cs.period_start DESC, cs.synced_at DESC LIMIT $limit`  
  (opcionalmente filtrado por `accountId`; métricas impressions/clicks/cost derivadas do JSONB `metrics` no código.)

- **Contagem para home**  
  `SELECT count(*)::int FROM google_ads_accounts WHERE tenant_id = $tenantId`

---

## 4. Acesso e escopo

- Tenant sempre resolvido no servidor pela sessão (`getDashboardTenantContext()`).
- Não se confia em tenant vindo do frontend.
- Contas e snapshots sempre filtrados pelo `tenantId` atual nas funções do dashboard e na API de sync (que valida que a conta pertence ao tenant).

---

## 5. Limitações desta primeira versão

- Sem gráficos; apenas tabelas.
- Sem atribuição avançada Ads ↔ leads.
- Sync manual por conta via POST + redirect; sem polling de status do job na UI.

---

## 6. Navegação

- Link "Google Ads" no header do dashboard (shell).
- Card "Google Ads" na home do dashboard com número de contas conectadas.

---

# Polimento: filtros, paginação, moeda, escolha de conta

## 7. Objetivo do polimento

Melhorar usabilidade e consistência operacional: filtros e paginação na listagem de snapshots, escolha explícita da conta no OAuth (em vez do primeiro customer_id), e exibição de custo na moeda correta da conta.

## 8. Arquivos criados/alterados e responsabilidades (polimento)

### db/schema/integrations/google-ads-accounts.ts (alterado)

| Alteração |
|-----------|
| Coluna **currency_code** (varchar 8, opcional): preenchida no sync a partir de Customer.currency_code da API. |

### db/migrations/0001_google_ads_currency_code.sql (criado)

| Responsabilidade |
|------------------|
| `ALTER TABLE google_ads_accounts ADD COLUMN IF NOT EXISTS currency_code varchar(8)`. Executar antes de usar a nova funcionalidade. |

### server/dashboard/google-ads.ts (alterado)

| Responsabilidade |
|------------------|
| **GoogleAdsAccountRow**: inclui `currencyCode`. **CampaignSnapshotRow**: inclui `accountCurrencyCode` (do join). **ListCampaignSnapshotsOptions**: `accountId`, `periodFrom`, `periodTo` (YYYY-MM-DD), `page` (1-based), `pageSize` (default 50). **listCampaignSnapshotsForTenant**: retorna **ListCampaignSnapshotsResult** `{ items, total }`; filtros por período (gte periodStart, lte periodEnd); count separado para total; paginação com limit/offset. |

### server/integrations/google-ads/accounts.ts (alterado)

| Responsabilidade |
|------------------|
| **GoogleAdsAccountRow**: inclui `currencyCode`. **getGoogleAdsAccountById**: seleciona `currencyCode`. **updateAccountCurrency(accountId, currencyCode)**: atualiza a coluna (usado no sync quando ainda null). |

### server/integrations/google-ads/client.ts (alterado)

| Responsabilidade |
|------------------|
| **getCustomerCurrency(customerId, accessToken)**: GAQL `SELECT customer.id, customer.currency_code FROM customer LIMIT 1`; retorna o código ISO (ex: BRL, USD) ou `{ error }`. Usado no sync para preencher a conta. |

### server/integrations/google-ads/sync.ts (alterado)

| Responsabilidade |
|------------------|
| Antes de buscar métricas: se `!account.currencyCode`, chama **getCustomerCurrency**, então **updateAccountCurrency**; em seguida segue o fluxo normal de métricas. |

### server/google-ads-pending.ts (criado)

| Responsabilidade |
|------------------|
| Estado temporário OAuth no Redis: **loadPendingConnection(token, tenantId)** retorna `{ customerIds }` para a página de escolha (não remove). **consumePendingConnection(token, tenantId)** retorna payload e remove a chave (usado na API complete). Chave: `google_ads_pending:{token}`, TTL 600 s. |

### app/api/google-ads/auth/callback/route.ts (alterado)

| Responsabilidade |
|------------------|
| Após obter tokens e lista de contas acessíveis: não persiste conta; gera **pendingToken**, grava no Redis (tenantId, tokens criptografados, customerIds), redireciona para **/dashboard/google-ads/connect?pending=TOKEN**. Erros redirecionam para `/dashboard/google-ads?google_ads_error=...`. |

### app/(dashboard)/google-ads/connect/page.tsx (criado)

| Responsabilidade |
|------------------|
| Página de escolha de conta: valida `pending` e tenant via **loadPendingConnection**; lista **customerIds** em radio; campo opcional **label**; formulário POST para **/api/google-ads/auth/complete** com pending, externalId, label. Se pending inválido/expirado, redireciona com erro. |

### app/api/google-ads/auth/complete/route.ts (criado)

| Responsabilidade |
|------------------|
| POST: valida sessão e tenant; lê body (pending, externalId, label); **consumePendingConnection**; verifica que externalId está em customerIds; **saveOrUpdateGoogleAdsAccount**; redireciona para `/dashboard/google-ads?google_ads=connected`. |

### app/(dashboard)/google-ads/page.tsx (alterado)

| Responsabilidade |
|------------------|
| **Filtros**: formulário GET com conta (select), período (periodFrom, periodTo), botão Filtrar; paginação com Anterior/Próxima e "Página X de Y", preservando filtros na URL. **Custo**: **formatCost(value, accountCurrencyCode)** — Intl com currency quando código válido (3 chars); senão valor numérico. **Contas**: coluna Moeda (currencyCode); botão "Conectar conta" (link para /api/google-ads/auth/start). **Mensagens**: exibe `google_ads=connected` e `google_ads_error` / `google_ads_message`. **Snapshots**: usa `snapshotResult.items` e `snapshotResult.total`; pageSize 50; texto "Exibindo X–Y de Z". |

## 9. Decisões de UX e modelagem

- **Escolha de conta**: Em vez de conectar automaticamente o primeiro customer_id retornado pela API, o callback grava um estado "pending" no Redis e redireciona para uma página onde o usuário escolhe qual conta conectar e pode informar um rótulo. O token pending expira em 10 minutos e é consumido (deletado) ao completar ou pode expirar sem uso.
- **Moeda**: A moeda é da conta (Customer.currency_code), não do snapshot. Armazenada em **google_ads_accounts.currency_code**, preenchida no primeiro sync (ou quando ainda null). A listagem de snapshots faz join com a conta e expõe **accountCurrencyCode** por linha para formatação correta do custo. Não se assume mais BRL fixo: se a conta não tiver moeda ainda, o custo é exibido como número.
- **Filtros**: Filtro por conta (dropdown com todas as contas do tenant + "Todas"), e por período (de/até em datas). Submissão por GET para que a URL reflita o estado e a paginação preserve os filtros.
- **Paginação**: Limit/offset com page (1-based) e pageSize 50; total via count(*) com os mesmos filtros; links Anterior/Próxima preservando searchParams.

## 10. Queries principais (polimento)

- **Snapshots com filtros e total**: mesma query de listagem com `WHERE` estendido: `AND period_start >= $periodFrom` (se informado), `AND period_end <= $periodTo` (se informado); `ORDER BY period_start DESC, synced_at DESC LIMIT $pageSize OFFSET $offset`. Count: `SELECT count(*)::int FROM campaign_snapshots WHERE ...` (mesmas condições, sem join).
- **Contas**: select passa a incluir `currency_code`.

## 11. Limitações desta versão (polimento)

- Sem gráficos; sem atribuição Ads ↔ leads; sem dashboard analítica completa.
- Nomes amigáveis das contas (ex.: nome do cliente) não são buscados na API na tela de escolha — exibição apenas por customer_id.
- Moeda preenchida apenas após o primeiro sync bem-sucedido; até lá o custo pode aparecer como número sem símbolo de moeda.
- Paginação simples (Anterior/Próxima); sem tamanho de página configurável na UI (fixo 50).
