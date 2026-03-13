# Base 2 — Google Ads Etapa 1: Arquitetura da integração e fluxo de sincronização

## 1. Objetivo

Iniciar a integração com Google Ads a partir da arquitetura de **sync** e **persistência de snapshots**: trazer dados de mídia paga para dentro da aplicação de forma consistente com a arquitetura já existente (Typebot/Evolution). Foco em arquitetura de integração, autenticação/configuração, sync periódico e persistência em `google_ads_sync_logs` e `campaign_snapshots`.

**Fora do escopo desta etapa:** dashboard analítica completa, atribuição avançada Ads ↔ leads, IA.

---

## 2. Estrutura de pastas e módulos proposta

### 2.1 Visão geral

```
src/
├── app/
│   └── api/
│       └── google-ads/                    # Rotas autenticadas (sessão + tenant)
│           ├── auth/
│           │   ├── callback/route.ts      # GET: OAuth callback (code → refresh_token, salva conta)
│           │   └── start/route.ts         # GET: redireciona para consentimento Google
│           └── sync/
│               └── [accountId]/route.ts  # POST: dispara sync sob demanda (opcional)
│
├── server/
│   └── integrations/
│       └── google-ads/
│           ├── index.ts
│           ├── auth.ts                   # Troca code por tokens; refresh access_token
│           ├── client.ts                 # Cliente Google Ads API (GAQL, campanhas)
│           ├── config.ts                 # Scopes, encrypt/decrypt tokens (env)
│           └── sync.ts                   # runSyncForAccount(accountId): fetch + upsert snapshots + log
│
├── workers/
│   ├── queue/
│   │   ├── types.ts                      # + JobSyncGoogleAdsAccount
│   │   └── client.ts                     # + queue:sync:google-ads
│   ├── runner.ts                         # + consumidor fila sync Google Ads (ou job agendado)
│   └── jobs/
│       └── google-ads-sync.ts            # Lógica agendada: listar contas, enfileirar sync por conta
│
└── db/
    └── schema/                           # Já existente
        ├── integrations/
        │   └── google-ads-accounts.ts     # Contas; refresh_token, access_token, last_synced_at, last_sync_error
        ├── raw-events/
        │   └── google-ads-sync-logs.ts   # Log por execução de sync
        └── snapshots/
            └── campaign-snapshots.ts     # Métricas por campanha por período
```

### 2.2 Responsabilidades por camada

| Camada | Responsabilidade |
|--------|------------------|
| **app/api/google-ads/auth/** | Iniciar OAuth (redirect para Google); callback recebe `code`, chama server/integrations/google-ads/auth para trocar por tokens, persiste conta em `google_ads_accounts` (tenant da sessão). Requer sessão + membership no tenant. |
| **app/api/google-ads/sync/** | (Opcional) POST para disparar sync sob demanda para uma conta; valida tenant + conta; enfileira job ou chama sync direto. |
| **server/integrations/google-ads/** | **auth:** trocar code por refresh_token/access_token; refresh de access_token quando expirado. **client:** chamar Google Ads API (GAQL) para campanhas + métricas no período. **sync:** carregar conta, refresh token se necessário, chamar API, upsert `campaign_snapshots`, inserir `google_ads_sync_logs`, atualizar `last_synced_at` / `last_sync_error` na conta. **config:** scopes OAuth, encrypt/decrypt de tokens (ex.: env ENCRYPTION_KEY). |
| **workers/** | Job periódico (cron ou loop com intervalo): listar contas ativas, enfileirar um job por conta. Consumidor: processa job `sync_google_ads_account` chamando `runSyncForAccount(accountId)`. |
| **db/schema** | Já existente: `google_ads_accounts`, `google_ads_sync_logs`, `campaign_snapshots`. |

---

## 3. Fluxo de autenticação/configuração da conta

1. **Usuário** acessa “Conectar Google Ads” no dashboard (futuro) ou rota protegida que chama `GET /api/google-ads/auth/start`.
2. **start:** Gera state (CSRF), guarda em cookie ou sessão, redireciona para Google OAuth com `client_id`, `redirect_uri` (callback da app), `scope` (ex.: `https://www.googleapis.com/auth/adwords`), `access_type=offline`, `prompt=consent` (para receber refresh_token).
3. **Google** redireciona para `GET /api/google-ads/auth/callback?code=...&state=...`.
4. **callback:** Valida state; troca `code` por tokens (refresh_token, access_token, expires_in) via server/integrations/google-ads/auth; identifica **customer_id** (conta Google Ads) via API ou parâmetro aprovado; persiste em `google_ads_accounts`: `tenant_id` (da sessão), `external_id` = customer_id (sem hífens), `refresh_token_encrypted`, `access_token_encrypted`, `token_expires_at`; opcionalmente `label`. Redirect para dashboard com sucesso/erro.
5. **Segurança:** Nunca logar tokens; armazenar refresh_token e access_token criptografados; callback só com sessão válida e tenant definido.

---

## 4. Fluxo de sync periódico

1. **Agendamento:** Worker (cron ou loop a cada X minutos) executa job que lista `google_ads_accounts` (por tenant ou todas) e, para cada conta, enfileira job `sync_google_ads_account` com `{ accountId }` (ou `tenantId` + `accountId`).
2. **Consumidor:** Worker retira job da fila, chama `runSyncForAccount(accountId)` em server/integrations/google-ads/sync.
3. **runSyncForAccount:**
   - Carrega conta do banco; verifica tenant.
   - Abre log: INSERT em `google_ads_sync_logs` (tenant_id, google_ads_account_id, sync_started_at = now(), status = 'running' ou deixar null até fim).
   - Se access_token expirado (ou ausente), chama refresh (refresh_token → novo access_token, token_expires_at).
   - Define período de sync (ex.: últimos 7 dias, granularidade diária; ou YESTERDAY para primeira versão).
   - Chama Google Ads API (GAQL): campanhas com métricas (impressões, cliques, custo, conversões conforme disponível) para o período.
   - Para cada (campanha, dia): upsert em `campaign_snapshots` por (tenant_id, google_ads_account_id, external_campaign_id, period_start).
   - Atualiza log: sync_finished_at = now(), status = 'success' | 'partial' | 'error', response_summary (ex.: campanhas processadas), error_message se falha.
   - Atualiza conta: last_synced_at = now(), last_sync_error = null em sucesso; em falha last_sync_error = mensagem (truncada 1024).
4. **Resposta:** Sync é assíncrono quando via fila; se houver rota POST sync sob demanda, pode retornar 202 Accepted e “sync enfileirado”.

---

## 5. Persistência em google_ads_sync_logs e campaign_snapshots

### 5.1 google_ads_sync_logs (append-only)

| Campo | Uso |
|-------|-----|
| tenant_id, google_ads_account_id | Escopo e auditoria. |
| sync_started_at | Início da execução. |
| sync_finished_at | Preenchido ao terminar (sucesso ou erro). |
| status | `success` \| `partial` \| `error`. |
| request_params | Ex.: `{ periodStart, periodEnd }` para reprodutibilidade. |
| response_summary | Ex.: `{ campaignsFetched, snapshotsUpserted }`. |
| error_message | Mensagem de erro (máx. 1024) em caso de falha. |

### 5.2 campaign_snapshots (upsert por período)

- **Chave única:** (tenant_id, google_ads_account_id, external_campaign_id, period_start).
- **Campos:** campaign_name, period_end, metrics (JSON: impressions, clicks, cost, conversions, etc.), synced_at.
- **Idempotência:** Reexecutar sync para o mesmo período faz **upsert** (ON CONFLICT UPDATE metrics, synced_at, campaign_name). Não duplicar linhas por período.

### 5.3 google_ads_accounts (atualização pós-sync)

- **last_synced_at:** Preenchido ao concluir sync com sucesso (ou último sucesso, conforme política).
- **last_sync_error:** Limpo em sucesso; preenchido com mensagem truncada em falha (para exibir no dashboard).
- **access_token / token_expires_at:** Atualizados após refresh no início do sync.

---

## 6. Tratamento de erros e last_synced_at

- **Erro ao refresh token:** Registrar em sync_log (status = error, error_message); atualizar last_sync_error na conta; não atualizar last_synced_at. Próximo sync pode tentar novamente (ou usuário reconectar).
- **Erro na API Google Ads (rate limit, 4xx/5xx):** Registrar em sync_log; last_sync_error na conta; sync_finished_at preenchido. Opcional: backoff antes de reprocessar.
- **Erro parcial (ex.: algumas campanhas falham):** status = 'partial'; response_summary com detalhes; last_synced_at pode ser atualizado se houve algum dado persistido (ou não, conforme política).
- **Sucesso:** status = 'success'; last_synced_at = now(); last_sync_error = null na conta.

---

## 7. Idempotência e upsert dos snapshots por período

- **Período:** Definir janela (ex.: period_start = date, period_end = date para granularidade diária). Para cada (conta, campanha, period_start) existe no máximo uma linha.
- **Upsert:** INSERT ... ON CONFLICT (tenant_id, google_ads_account_id, external_campaign_id, period_start) DO UPDATE SET campaign_name = EXCLUDED.campaign_name, period_end = EXCLUDED.period_end, metrics = EXCLUDED.metrics, synced_at = EXCLUDED.synced_at. Assim, reexecutar o sync para o mesmo período não duplica dados e reflete o último fetch.
- **Reprocessamento:** Rodar sync de novo para um intervalo já sincronizado é seguro: apenas atualiza as linhas existentes.

---

## 8. Ordem recomendada de implementação

1. **Config e auth (server)**  
   - Criar `server/integrations/google-ads/config.ts` (scopes, encrypt/decrypt, env GOOGLE_ADS_CLIENT_ID, SECRET, ENCRYPTION_KEY).  
   - Implementar `auth.ts`: exchange code → tokens; refresh access_token a partir de refresh_token.  
   - (Opcional) Função para obter customer_id após OAuth (uma chamada leve à API).

2. **Conta no banco**  
   - Callback da app: `GET /api/google-ads/auth/callback`. Validar sessão + tenant; trocar code por tokens; inserir ou atualizar `google_ads_accounts` (external_id = customer_id, tokens criptografados).  
   - Rota `GET /api/google-ads/auth/start` (redirect para Google).

3. **Cliente API (server)**  
   - `client.ts`: função que, dado access_token e customer_id, executa GAQL para campanhas + métricas (ex.: impressions, clicks, cost) para um intervalo de datas. Retornar estrutura normalizada (lista de { campaignId, campaignName, periodStart, periodEnd, metrics }).

4. **Sync (server)**  
   - `sync.ts`: `runSyncForAccount(accountId)`. Carregar conta; refresh token se necessário; INSERT sync_log (sync_started_at); chamar client para período (ex.: ontem ou últimos 7 dias); upsert campaign_snapshots; UPDATE sync_log (sync_finished_at, status, response_summary/error_message); UPDATE conta (last_synced_at, last_sync_error).

5. **Worker**  
   - Adicionar job type `sync_google_ads_account` e fila `queue:sync:google-ads`.  
   - Job agendado: listar contas (ex.: onde refresh_token não nulo), enfileirar um job por conta.  
   - Consumidor: ao receber job, chamar `runSyncForAccount(accountId)`.

6. **Sync sob demanda (opcional)**  
   - `POST /api/google-ads/sync/[accountId]`: verificar que a conta pertence ao tenant da sessão; enfileirar job sync para essa conta; retornar 202.

7. **Observabilidade**  
   - Logs no worker (início/fim de sync por accountId, erros). Consultas a sync_logs para histórico na UI (fase posterior).

---

## 9. Decisões de modelagem e processamento

- **Uma conta Google Ads por (tenant, external_id):** external_id = customer_id sem hífens; constraint único (tenant_id, external_id). Reconexão = mesmo external_id atualiza tokens.
- **Snapshots apenas de campanha:** Primeira versão sem nível de ad group ou anúncio; reduz complexidade e volume. campaign_snapshots.metrics é JSONB para flexibilidade (impressions, clicks, cost, conversions).
- **Granularidade diária:** period_start = period_end = mesma data para cada linha; facilita upsert e consultas por dia. Períodos agregados (semana/mês) podem ser calculados na leitura.
- **Sync por conta:** Cada job processa uma conta; paralelismo por múltiplos workers consumindo a mesma fila, sem lock global.
- **Tokens:** Armazenar sempre criptografados; descriptografar só em memória no momento do refresh ou da chamada à API.

---

## 10. Limitações da primeira versão

- **Sem dashboard analítica:** Apenas persistência; telas de gráficos/KPIs ficam para etapa posterior.
- **Sem atribuição Ads ↔ leads:** Não ligar cliques/impressões a leads ou conversões da aplicação nesta etapa.
- **Sem IA:** Nenhum modelo ou classificação.
- **Métricas:** Conjunto mínimo (impressions, clicks, cost; conversões se a conta tiver); extensão posterior em metrics (JSONB).
- **Período de sync:** Fixo (ex.: ontem ou últimos 7 dias) na primeira versão; sem seletor de intervalo na UI.
- **OAuth:** Um scope inicial (adwords); sem múltiplas contas por usuário na UI nesta etapa (pode haver várias contas por tenant no banco).
- **Rate limits:** Tratamento básico (log e last_sync_error); retry/backoff pode ser refinado depois.

---

## 11. Resumo

- **Estrutura:** app/api/google-ads (auth + sync opcional), server/integrations/google-ads (auth, client, config, sync), workers (fila + job agendado + consumidor), db já com google_ads_accounts, google_ads_sync_logs, campaign_snapshots.
- **Fluxos:** OAuth start → Google → callback → troca code por tokens → persistência de conta; sync periódico ou sob demanda → fila → runSyncForAccount → refresh token → API → upsert snapshots → log e last_synced_at/last_sync_error.
- **Idempotência:** Upsert em campaign_snapshots por (tenant, account, campaign_id, period_start); sync_log append-only; conta atualizada ao fim de cada execução.
- **Próximos passos (fora desta etapa):** Dashboard de métricas, atribuição, seleção de período na UI, retry avançado.
