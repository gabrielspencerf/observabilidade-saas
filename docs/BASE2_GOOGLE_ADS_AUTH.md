# Base 2 — Google Ads: Conexão e autenticação (OAuth + persistência da conta)

## 1. Objetivo

Fechar o fluxo OAuth (start + callback) e persistir corretamente uma conta Google Ads vinculada ao tenant da sessão. Sem sync de métricas nesta etapa; foco em conectar a conta e gravá-la em `google_ads_accounts`.

---

## 2. Arquivos criados/alterados e responsabilidades

### server/integrations/google-ads/config.ts (novo)

| Responsabilidade |
|------------------|
| Leitura de env: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REDIRECT_URI (ou derivado de NEXT_PUBLIC_APP_URL), GOOGLE_ADS_ENCRYPTION_KEY (32 bytes hex/base64), GOOGLE_ADS_STATE_SECRET (opcional; fallback SESSION_SECRET). Scopes e URLs OAuth Google. **encryptTokens(plaintext)** / **decryptTokens(ciphertext)**: AES-256-GCM para tokens; nunca logar. **createSignedState(tenantId)**: state assinado com HMAC-SHA256 (tenantId + nonce + ts). **verifySignedState(state)**: valida assinatura e TTL (10 min); retorna payload ou null. |

### server/integrations/google-ads/auth.ts (novo)

| Responsabilidade |
|------------------|
| **exchangeCodeForTokens(code)**: POST para oauth2.googleapis.com/token com code, client_id, client_secret, redirect_uri, grant_type=authorization_code; retorna refresh_token, access_token, expires_in ou { error }. **getAccessibleCustomers(accessToken)**: GET googleads.googleapis.com/v20/customers:listAccessibleCustomers com Bearer token; retorna lista de customer IDs (resourceNames sem prefixo "customers/") ou { error }. Não logar tokens. |

### server/integrations/google-ads/accounts.ts (novo)

| Responsabilidade |
|------------------|
| **saveOrUpdateGoogleAdsAccount(input)**: Upsert em google_ads_accounts por (tenant_id, external_id). external_id = customer_id (sem hífens). Campos: refresh_token_encrypted, access_token_encrypted, token_expires_at, label opcional. Em sucesso: last_sync_error = null; last_synced_at permanece null em insert, não alterado em update (reconexão). Retorna { id } ou { error }. |

### server/integrations/google-ads/index.ts (novo)

| Responsabilidade |
|------------------|
| Re-exporta config (state, encrypt, scopes, redirect), auth (exchange, getAccessibleCustomers), accounts (saveOrUpdate). |

### server/integrations/index.ts (alterado)

| Responsabilidade |
|------------------|
| Exporta módulo google-ads. |

### app/api/google-ads/auth/start/route.ts (novo)

| Responsabilidade |
|------------------|
| GET: Obtém sessão via cookie; exige currentTenantId e membership no tenant. Gera state assinado com tenantId. Redireciona para Google OAuth (client_id, redirect_uri, scope adwords, state, access_type=offline, prompt=consent). Se não autenticado → /login; se sem tenant → /dashboard/context; se falha ao criar state → /dashboard/home?google_ads_error=config. |

### app/api/google-ads/auth/callback/route.ts (novo)

| Responsabilidade |
|------------------|
| GET: Lê code e state da URL. Se error do provider → redirect com google_ads_error=oauth_denied. Valida state (verifySignedState); se inválido/expirado → invalid_state. Troca code por tokens; se falha → exchange_failed. Chama getAccessibleCustomers; se falha → list_accounts_failed; se vazio → no_accounts. Escolhe primeiro customer_id como external_id. Criptografa tokens, saveOrUpdateGoogleAdsAccount(tenantId do state). Sucesso → redirect /dashboard/home?google_ads=connected; erro → /dashboard/home?google_ads_error=...&google_ads_message=.... Nunca logar tokens ou descrições sensíveis. |

### .env.example (alterado)

| Responsabilidade |
|------------------|
| Comentários e variáveis de exemplo para GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REDIRECT_URI, GOOGLE_ADS_ENCRYPTION_KEY, GOOGLE_ADS_STATE_SECRET. |

---

## 3. Fluxo completo

1. Usuário (autenticado, com tenant selecionado) acessa **GET /api/google-ads/auth/start**.
2. **Start:** Valida sessão e tenant; gera state = assinatura(tenantId, nonce, ts). Redireciona para Google com client_id, redirect_uri, scope=https://www.googleapis.com/auth/adwords, state, access_type=offline, prompt=consent.
3. Usuário autoriza (ou nega) no Google; Google redireciona para **GET /api/google-ads/auth/callback?code=...&state=...** (ou error/error_description).
4. **Callback:** Se error → redirect home com google_ads_error=oauth_denied. Valida state (assinatura + TTL 10 min); extrai tenantId. Troca code por refresh_token e access_token. Chama ListAccessibleCustomers com access_token; obtém lista de customer IDs. Usa o primeiro como external_id. Criptografa refresh_token e access_token; calcula token_expires_at. saveOrUpdateGoogleAdsAccount(tenantId, externalId, tokens criptografados). Sucesso → redirect /dashboard/home?google_ads=connected; falha em qualquer passo → redirect com código e mensagem genérica.
5. Conta fica em google_ads_accounts com last_sync_error = null, last_synced_at = null (sync será implementado depois).

---

## 4. Decisões de segurança

- **Tenant só do state:** O tenant usado na persistência vem exclusivamente do state assinado (HMAC com secret), nunca de query/body ou frontend.
- **State com TTL:** State expira em 10 minutos; callback rejeita state expirado ou com assinatura inválida.
- **Tokens nunca em log:** Nenhum log inclui refresh_token, access_token ou descriptografados; em erros do provider logamos apenas tipo de erro.
- **Tokens criptografados no banco:** refresh_token e access_token armazenados com AES-256-GCM (ENCRYPTION_KEY 32 bytes).
- **Sessão obrigatória no start:** Start exige sessão e tenant atual; sem sessão → login; sem tenant → /dashboard/context.
- **Callback sem sessão:** Callback não exige cookie de sessão (Google redireciona sem cookies); a legitimidade do vínculo tenant-conta é garantida pelo state assinado gerado no start quando o usuário ainda estava autenticado.

---

## 5. Limitações desta primeira versão

- **Uma conta por lista:** Usa o primeiro customer_id retornado por ListAccessibleCustomers; não há tela de escolha de conta nem suporte explícito a múltiplas contas por tenant na UI (o schema permite várias por tenant).
- **Sem login-customer-id:** Não persiste nem usa ainda o contexto de manager account (MCC); será relevante quando o sync usar a API com contas sob MCC.
- **Sem sync:** Não há job de sync nem atualização de last_synced_at; apenas persistência da conta e tokens.
- **Redirect fixo:** Sucesso e erro redirecionam para /dashboard/home; não há página dedicada “Google Ads conectado” nem link de “Conectar Google Ads” na home (pode ser adicionado depois).
- **Mensagens de erro:** Mensagens técnicas podem aparecer em google_ads_message; idealmente a UI as exibe de forma controlada.

---

## 6. Resumo

- **Rotas:** GET /api/google-ads/auth/start (redirect para Google) e GET /api/google-ads/auth/callback (troca code, persiste conta).
- **State:** Assinado com HMAC; contém tenantId; TTL 10 min.
- **Persistência:** google_ads_accounts com external_id = customer_id, tokens criptografados, last_sync_error = null.
- **Segurança:** Tenant do state; tokens nunca em log; criptografia AES-256-GCM no banco.
