# Módulo de configuração global (app_global_config)

Infraestrutura para configurações editáveis pela web, com valores sensíveis criptografados no banco. Não edita .env.

---

## 1. Uso do módulo

Importe de `@/server/config/global`:

```ts
import {
  getGlobalConfig,
  setGlobalConfig,
  getMultipleGlobalConfig,
  getGlobalConfigOrEnv,
  type SetGlobalConfigOptions,
} from "@/server/config/global";
```

### getGlobalConfig(key: string): Promise<string | null>

- Lê a chave no banco. Se existir `value_encrypted`, descriptografa com `CONFIG_ENCRYPTION_KEY` e retorna; senão retorna `value_plain`.
- Retorna `null` se a chave não existir.
- **Nunca** logar o retorno (pode ser segredo).

### setGlobalConfig(key, value, options?): Promise<void>

- Cria ou atualiza a chave (upsert por `key`).
- **options.sensitive:** se `true`, o valor é criptografado e armazenado em `value_encrypted`; `value_plain` fica nulo. Exige `CONFIG_ENCRYPTION_KEY` em .env.
- **options.updatedBy:** UUID do usuário que alterou (auditoria).
- **Nunca** logar o valor.

### getMultipleGlobalConfig(keys: string[]): Promise<Record<string, string | null>>

- Lê várias chaves em uma única query. Chaves ausentes não entram no resultado.
- Valores sensíveis são descriptografados internamente.

### getGlobalConfigOrEnv(configKey, envKey): Promise<string | null>

- Ordem: 1) valor no banco (`configKey`), 2) variável de ambiente (`envKey`).
- Use para integrações que podem ser configuradas pelo setup (banco) ou por .env, sem quebrar quem já usa só .env.

---

## 2. Chaves: plain vs encrypted

| Chave (exemplo) | Armazenamento | Observação |
|-----------------|---------------|------------|
| `google_ads_client_id` | **plain** | Não é segredo. |
| `google_ads_client_secret` | **encrypted** | Sensível. |
| `google_ads_redirect_uri` | plain | |
| `google_ads_state_secret` | **encrypted** | Sensível. |
| `google_ads_developer_token` | **encrypted** | Sensível. |
| `google_ads_login_customer_id` | plain | ID público. |
| `setup_initial_done` | plain | "1" ou "0". |
| `typebot_webhook_base_url` | plain | Hint para UI. |
| `evolution_api_base_url` | plain | Hint para UI. |

Regra: **plain** para dados que podem ser exibidos na UI ou não são secretos; **encrypted** (sensitive: true) para segredos (senhas, tokens, client secrets).

---

## 3. Criptografia e env

- Algoritmo: **AES-256-GCM** (IV 12 bytes, auth tag 16 bytes).
- Chave: variável de ambiente **`CONFIG_ENCRYPTION_KEY`** (32 bytes em hex — 64 caracteres — ou base64 — 44 caracteres).
- Se não houver `CONFIG_ENCRYPTION_KEY` e o código tentar **ler** ou **gravar** um valor sensível, a função lança erro claro. Valores **não sensíveis** (só `value_plain`) funcionam sem a chave.

---

## 4. Integração com .env (fallback)

- **Não** substituir leituras de `process.env` por `getGlobalConfig` nesta etapa em todos os pontos; a refatoração (ex.: Google Ads) vem em etapa posterior.
- Quando for refatorar: usar `getGlobalConfigOrEnv('google_ads_client_id', 'GOOGLE_ADS_CLIENT_ID')` (ou equivalente) para manter fallback: primeiro banco, depois .env.
- Assim as integrações atuais (que leem só .env) continuam funcionando; quando o setup existir, os valores do banco passam a ter prioridade.

---

## 5. Banco

- Tabela: **`app_global_config`**.
- Colunas: `id`, `key` (unique), `value_plain`, `value_encrypted`, `is_sensitive`, `updated_at`, `updated_by`.
- Migration: `0002_app_global_config.sql`.

Schema em `src/db/schema/app/app-global-config.ts`.
