# Base 2 — Google Ads: Sync mínimo (métricas por campanha)

## 1. Objetivo

Implementar o fluxo mínimo de sincronização de métricas por conta conectada: carregar conta, renovar token quando necessário, chamar a Google Ads API com developer token e login-customer-id (MCC), persistir logs de sync e snapshots diários em `google_ads_sync_logs` e `campaign_snapshots`. Sem dashboard analítica; foco em sync confiável e idempotente.

---

## 2. Arquivos criados/alterados e responsabilidades

### server/integrations/google-ads/config.ts (alterado)

| Responsabilidade |
|------------------|
| **getGoogleAdsDeveloperToken()**: lê GOOGLE_ADS_DEVELOPER_TOKEN (obrigatório para sync). **getGoogleAdsLoginCustomerId()**: lê GOOGLE_ADS_LOGIN_CUSTOMER_ID (opcional); quando definido, usado como header login-customer-id nas requisições à API (contexto MCC). |

### server/integrations/google-ads/auth.ts (alterado)

| Responsabilidade |
|------------------|
| **refreshAccessToken(refreshToken)**: POST para oauth2.googleapis.com/token com grant_type=refresh_token; retorna access_token e expires_in ou { error }. Usado no sync quando o token expirou. |

### server/integrations/google-ads/accounts.ts (alterado)

| Responsabilidade |
|------------------|
| **getGoogleAdsAccountById(accountId)**: SELECT da conta por id; retorna null se não existir. **updateAccountTokens(accountId, accessTokenEncrypted, tokenExpiresAt)**: atualiza access_token e token_expires_at após refresh. **updateAccountSyncResult(accountId, result)**: atualiza last_synced_at (e zera last_sync_error) em sucesso, ou last_sync_error em falha (truncado 1024). |

### server/integrations/google-ads/client.ts (novo)

| Responsabilidade |
|------------------|
| **fetchCampaignMetrics(customerId, accessToken, options?)**: monta headers (Authorization Bearer, developer-token, login-customer-id se configurado); POST para googleads.googleapis.com/v20/customers/{customerId}/googleAds:searchStream com GAQL (campaign.id, campaign.name, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, WHERE segments.date DURING LAST_N_DAYS e campaign.status = ENABLED). Parse da resposta (array de batches ou NDJSON); retorna CampaignMetricRow[] ou { error }. customerId = conta cliente (external_id). |

### server/integrations/google-ads/sync.ts (novo)

| Responsabilidade |
|------------------|
| **runSyncForAccount(accountId)**: carrega conta; insere linha em google_ads_sync_logs (sync_started_at, status=running, request_params); descriptografa refresh_token; se access_token ausente ou expirado (buffer 1 min), chama refreshAccessToken, atualiza conta com novo token; chama fetchCampaignMetrics(customerId, accessToken, { daysBack: 7 }); para cada linha faz upsert em campaign_snapshots (tenant_id, google_ads_account_id, external_campaign_id, period_start, campaign_name, period_end, metrics, synced_at); em erro de API ou parse: finishLog(error), updateAccountSyncResult(error); em erro de persistência: finishLog(partial), updateAccountSyncResult(error); em sucesso: finishLog(success, response_summary), updateAccountSyncResult(last_synced_at). Retorna { ok, logId } ou { ok: false, error, logId? }. |

### server/integrations/google-ads/index.ts (alterado)

| Responsabilidade |
|------------------|
| Exporta refreshAccessToken, getGoogleAdsAccountById, updateAccountTokens, updateAccountSyncResult, fetchCampaignMetrics, runSyncForAccount e tipos. |

### workers/queue/types.ts (alterado)

| Responsabilidade |
|------------------|
| **JobSyncGoogleAdsAccount**: type "sync_google_ads_account", accountId. **QUEUE_SYNC_GOOGLE_ADS** = "queue:sync:google-ads". JobPayload inclui JobSyncGoogleAdsAccount. |

### workers/queue/client.ts (alterado)

| Responsabilidade |
|------------------|
| getQueueName para sync_google_ads_account → QUEUE_SYNC_GOOGLE_ADS. Export de QUEUE_SYNC_GOOGLE_ADS. |

### workers/runner.ts (alterado)

| Responsabilidade |
|------------------|
| Consumidor da fila QUEUE_SYNC_GOOGLE_ADS: dequeue(5s), se job.type === sync_google_ads_account chama runSyncForAccount(job.accountId); log de sucesso (accountId, logId) ou falha (accountId, error, logId). loopGoogleAdsSync() em setImmediate. |

### app/api/google-ads/sync/[accountId]/route.ts (novo)

| Responsabilidade |
|------------------|
| POST: exige sessão e tenant atual; verifica que a conta existe e pertence ao tenant; enfileira job sync_google_ads_account; retorna 202 { message, accountId }. 401/403/404 conforme validações. |

### .env.example (alterado)

| Responsabilidade |
|------------------|
| GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_LOGIN_CUSTOMER_ID (comentados). |

---

## 3. Fluxo completo do sync

1. **Disparo:** POST /api/google-ads/sync/[accountId] (com sessão e tenant) ou job enfileirado por outro meio. Valida que a conta pertence ao tenant atual.
2. **Enfileiramento:** LPUSH em queue:sync:google-ads com { type: "sync_google_ads_account", accountId }.
3. **Consumidor (worker):** BRPOP queue:sync:google-ads; chama runSyncForAccount(accountId).
4. **runSyncForAccount:**  
   - Carrega conta (getGoogleAdsAccountById).  
   - INSERT google_ads_sync_logs (tenant_id, google_ads_account_id, sync_started_at, status=running, request_params).  
   - Descriptografa refresh_token; se access_token expirado ou ausente → refreshAccessToken → updateAccountTokens.  
   - fetchCampaignMetrics(customerId=external_id, accessToken, daysBack=7): headers Authorization, developer-token, login-customer-id (se GOOGLE_ADS_LOGIN_CUSTOMER_ID definido).  
   - Para cada CampaignMetricRow: upsert campaign_snapshots (ON CONFLICT tenant_id, google_ads_account_id, external_campaign_id, period_start DO UPDATE).  
   - UPDATE google_ads_sync_logs (sync_finished_at, status success|partial|error, response_summary, error_message).  
   - UPDATE google_ads_accounts (last_synced_at e last_sync_error=null em sucesso; last_sync_error em falha).
5. **Resposta:** Sync é assíncrono; rota POST retorna 202. Resultado visível em sync_logs e last_synced_at/last_sync_error na conta.

---

## 4. Headers / contexto usados na chamada à API

- **Authorization:** Bearer {access_token} (OAuth do usuário que conectou a conta).
- **Content-Type:** application/json.
- **developer-token:** GOOGLE_ADS_DEVELOPER_TOKEN (credencial global da aplicação / MCC).
- **login-customer-id:** GOOGLE_ADS_LOGIN_CUSTOMER_ID (opcional). Quando as contas cliente são gerenciadas por uma MCC, enviar o customer ID da MCC (sem hífens). Não enviar quando a conta conectada for standalone.
- **URL:** POST https://googleads.googleapis.com/v20/customers/{customerId}/googleAds:searchStream — customerId = external_id da conta (conta cliente).

---

## 5. Decisões de idempotência

- **Sync log:** Append-only; cada execução gera uma nova linha (sync_started_at, status atualizado ao fim).
- **campaign_snapshots:** Chave única (tenant_id, google_ads_account_id, external_campaign_id, period_start). INSERT ... ON CONFLICT DO UPDATE (campaign_name, period_end, metrics, synced_at). Reexecutar o sync para o mesmo período não duplica linhas; apenas atualiza métricas e synced_at.
- **Conta:** last_synced_at e last_sync_error atualizados ao fim de cada execução; tokens atualizados apenas após refresh bem-sucedido.

---

## 6. Tratamento de erros

- **Refresh token falha:** status=error no log, error_message preenchido; last_sync_error na conta; last_synced_at não atualizado.
- **API (4xx/5xx ou mensagem de erro):** status=error no log; last_sync_error na conta.
- **Parse da resposta:** status=error no log; last_sync_error na conta.
- **Falha ao persistir snapshots (ex.: após parte dos upserts):** status=partial no log; response_summary com rowsFetched/rowsUpserted; last_sync_error na conta.
- Nenhum token ou segredo é logado; apenas accountId, logId e mensagens de erro genéricas.

---

## 7. Limitações desta primeira versão

- **Período fixo:** Últimos 7 dias (SYNC_DAYS_BACK); sem seletor de intervalo na UI.
- **Métricas:** Apenas impressions, clicks, cost_micros (e cost derivado); sem conversões nesta etapa.
- **Granularidade:** Diária (period_start = period_end por dia).
- **Campanhas:** Apenas status ENABLED; sem histórico de campanhas removidas.
- **Agendamento:** Não há cron interno; sync só roda quando job é enfileirado (ex.: POST manual ou integração futura com scheduler).
- **login-customer-id:** Global por env; não há login_customer_id por conta no banco (preparado para evolução).
- **Escolha de conta:** A conta sincronizada é a já cadastrada (external_id); a escolha/confirmação da conta correta fica para fluxo de UI futuro.

---

## 8. Resumo

- **Estrutura:** runSyncForAccount em server/integrations/google-ads/sync; client.ts para searchStream; auth (refresh), accounts (load/update), config (developer token, login-customer-id).
- **Persistência:** google_ads_sync_logs (append), campaign_snapshots (upsert por período), google_ads_accounts (last_synced_at / last_sync_error).
- **Worker:** Fila queue:sync:google-ads; consumidor chama runSyncForAccount.
- **Disparo manual:** POST /api/google-ads/sync/[accountId] (tenant-scoped, 202 enfileirado).
