# Infraestrutura e deploy na VPS

Este documento descreve como a infraestrutura funciona, quais variáveis de ambiente são necessárias e como subir a aplicação em uma VPS. Inclui o **setup inicial** (ainda no escopo via seed).

---

## 1. Como a infraestrutura funciona

A aplicação é composta por **três partes** que precisam estar no ar para uso completo:

```mermaid
flowchart LR
  subgraph app [Next.js]
    API[API Routes]
    Pages[Pages/SSR]
  end
  subgraph worker [Worker]
    Runner[runner.ts]
    Queues[Filas Redis]
  end
  subgraph data [Dados]
    PG[(PostgreSQL)]
    Redis[(Redis)]
  end
  API --> PG
  API --> Redis
  Runner --> Redis
  Runner --> PG
  Queues --> Redis
```

| Componente | O que faz | Como sobe |
|------------|-----------|-----------|
| **App Next.js** | Servidor web (SSR, API, auth, webhooks, admin, dashboard). Consome PostgreSQL (sessões, dados) e Redis (enfileirar jobs, rate-limit, health). | `npm run dev` (dev) ou `npm run build && npm run start` (prod). |
| **Worker** | Processo separado que consome filas no Redis (Typebot, Evolution, Google Ads sync). Escreve heartbeat no Redis; health da API verifica esse heartbeat. | `npm run worker:dev` (dev) ou `node`/`tsx` no `src/workers/runner.ts` (prod). |
| **PostgreSQL** | Banco principal: usuários, tenants, sessões, integrações, eventos, leads, conversas, snapshots. | Serviço na VPS ou managed DB. |
| **Redis** | Filas (LPUSH/BRPOP), heartbeat do worker, rate-limit. | Serviço na VPS ou managed Redis. |

**Fluxo resumido:**

- Usuário acessa a app → Next.js; login/sessão e dados vêm do PostgreSQL.
- Webhooks (Typebot/Evolution) chegam nas rotas `/api/webhooks/*` → validam, gravam evento no PostgreSQL e enfileiram job no Redis.
- O **worker** faz BRPOP nas filas, processa o job (lead, conversa, etc.) e atualiza o PostgreSQL; em falha faz retry e depois manda para DLQ.
- Health check (`/api/health`) testa PostgreSQL, Redis e idade do heartbeat do worker.

Não há Dockerfile da aplicação no repositório; existe apenas `docker-compose.dev.yml` para **Postgres + Redis** em desenvolvimento (a app e o worker rodam no host com `npm run dev` e `npm run worker:dev`).

---

## 2. Subir na VPS

### Opção A: VPS “bare” (Node + PM2 ou systemd)

1. **Serviços na VPS**
   - Instalar e rodar **PostgreSQL** e **Redis** (pacotes do SO, ou containers só para DB/Redis).
   - Criar um banco (ex.: `app`) e anotar a connection string.
   - Garantir que Redis esteja acessível (ex.: `localhost:6379` ou IP interno).

2. **Aplicação**
   - Clonar o repositório na VPS, instalar dependências (`npm ci`), criar `.env` (ver seção 3).
   - Build: `npm run build`.
   - Subir a app: `npm run start` (porta 3000) ou usar um process manager:
     - **PM2:** `pm2 start npm --name "app" -- start`
     - **systemd:** unit que executa `npm run start` (ou `node .next/standalone/server.js` se configurar output standalone no Next).
   - Colocar um reverse proxy (Nginx/Caddy) na frente com HTTPS e apontar para a porta da app.

3. **Worker**
   - Mesmo repositório, mesmo `.env` (com `REDIS_URL` e `DATABASE_URL`).
   - Em prod, rodar o worker como processo separado:
     - **PM2:** `pm2 start npm --name "worker" -- run worker:dev` (ou um script que chame `tsx src/workers/runner.ts`).
     - **systemd:** unit que executa `node`/`tsx` em `src/workers/runner.ts`.
   - O worker não serve HTTP; apenas consome Redis e grava no PostgreSQL.

4. **Setup inicial (uma vez)**  
   Na VPS, com `.env` já preenchido:
   - `npm run db:create` — cria o banco se não existir.
   - `npm run db:migrate` — aplica migrations.
   - `npm run db:seed` — cria roles, permissions, tenant e usuário admin (exige `SEED_ADMIN_PASSWORD` e opcionalmente `SEED_ADMIN_EMAIL`, etc.).

Depois disso, acessar a URL da app, fazer login no admin com o email/senha do seed e, se quiser, cadastrar Evolution/Typebot/UAZAPI em Admin → Integrações.

### Opção B: Docker na VPS (você monta o Dockerfile)

O repositório **não** inclui Dockerfile da app. Você pode:

- Usar `docker-compose.dev.yml` só para Postgres e Redis e rodar app + worker no host (como acima), ou
- Criar um `Dockerfile` que faça `npm ci`, `npm run build`, e execute `npm run start`; e outro processo (ou outro container) para o worker com `tsx src/workers/runner.ts`. As variáveis de ambiente seriam passadas via `docker run`/compose.

Em ambos os casos, a **lista de variáveis** é a mesma da seção 3.

---

## 3. Variáveis de ambiente necessárias

### Obrigatórias para a app subir (e login/dashboard básico)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://usuario:senha@localhost:5432/app` |
| `SESSION_SECRET` | Chave para assinar sessão/cookie; use valor longo e aleatório em produção | `openssl rand -hex 32` |

### Obrigatórias para webhooks, worker, rate-limit e observabilidade

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `REDIS_URL` | URL do Redis (filas, heartbeat, rate-limit) | `redis://localhost:6379` |

Sem `REDIS_URL`, a app sobe, mas webhooks (Typebot/Evolution), worker, rate-limit e health do worker não funcionam corretamente.

### Recomendadas em produção

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_APP_URL` | URL base da aplicação (redirects, OAuth, webhooks) | `https://seu-dominio.com` |
| `NODE_ENV` | `production` em produção | `production` |

### Setup inicial (seed) — obrigatórias para criar o primeiro admin

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `SEED_ADMIN_PASSWORD` | Senha do usuário admin criado pelo seed | — |
| `SEED_ADMIN_EMAIL` | (Opcional) Email do admin | `admin@example.com` |
| `SEED_ADMIN_NAME` | (Opcional) Nome do admin | Super Admin |
| `SEED_TENANT_NAME` | (Opcional) Nome do tenant inicial | Tenant de Teste |
| `SEED_TENANT_SLUG` | (Opcional) Slug do tenant | `tenant-teste` |

### Criptografia de segredos (Evolution, UAZAPI, Typebot API token)

Se você for cadastrar **API key da Evolution**, **UAZAPI** ou **token da API do Typebot** pela UI admin, é necessário definir **uma** destas (32 bytes, 64 hex ou 44 base64):

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `INTEGRATIONS_ENCRYPTION_KEY` | Preferencial para segredos de integrações | `openssl rand -hex 32` |
| `CONFIG_ENCRYPTION_KEY` | Fallback (também usado por setup global, se existir) | `openssl rand -hex 32` |

Se nenhuma estiver definida, o cadastro de Evolution/UAZAPI/Typebot com API key ou token vai falhar ao salvar (a app usa essa chave para criptografar em repouso).

### Google Ads (opcional)

Só necessárias se for usar Google Ads (OAuth e sync). Ver `.env.example` e `docs/CONFIG_CREDENTIALS.md` para a lista completa (`GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_ENCRYPTION_KEY`, `GOOGLE_ADS_DEVELOPER_TOKEN`, etc.).

### Typebot / Evolution / UAZAPI

Não há variáveis de ambiente **por** bot ou instância. Cadastro é feito em **Admin → Integrações** (ou via seed opcional para Typebot/Evolution). Opcionalmente:

- `TYPEBOT_API_BASE_URL` — base da API de métricas do Typebot (ex.: `https://api.typebot.io`).

### Resumo mínimo para VPS (produção funcional com webhooks + worker)

```env
# Mínimo
DATABASE_URL=postgresql://user:pass@host:5432/app
SESSION_SECRET=<valor-longo-aleatorio>
REDIS_URL=redis://host:6379

# Setup inicial (uma vez)
SEED_ADMIN_PASSWORD=<sua-senha-segura>
SEED_ADMIN_EMAIL=admin@seudominio.com

# Produção
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://seudominio.com

# Se for cadastrar Evolution/UAZAPI/Typebot com API key ou token
INTEGRATIONS_ENCRYPTION_KEY=<32-bytes-hex-ou-base64>
```

---

## 4. Setup inicial — ainda está no escopo?

**Sim.** O setup inicial é feito hoje pelo **seed** (não existe tela `/admin/setup` nem bootstrap por `BOOTSTRAP_SUPER_ADMIN_*` no código).

| O que | Como |
|-------|------|
| Criar banco | `npm run db:create` (usa `DATABASE_URL`; cria o DB se não existir). |
| Aplicar schema | `npm run db:migrate` (ou `npm run db:push` em dev). |
| Primeiro usuário e tenant | `npm run db:seed` (exige `SEED_ADMIN_PASSWORD`; cria roles, permissions, tenant e usuário super_admin). |

O seed é idempotente: pode rodar mais de uma vez; não duplica usuário/tenant se já existirem. Após o seed, você entra em **Admin** com o email/senha configurados e pode cadastrar Evolution, Typebot e UAZAPI em **Integrações**.

O documento `docs/SETUP_BOOTSTRAP_ARCHITECTURE.md` descreve uma **proposta** de setup web (`/admin/setup`) e bootstrap por variáveis `BOOTSTRAP_SUPER_ADMIN_*`; isso **não está implementado**. O caminho atual é: **variáveis no .env + seed**.

---

## 5. Checklist rápido para VPS

1. [ ] PostgreSQL e Redis instalados/rodando na VPS (ou acessíveis).
2. [ ] `.env` criado com `DATABASE_URL`, `SESSION_SECRET`, `REDIS_URL`, `NEXT_PUBLIC_APP_URL`, `SEED_ADMIN_PASSWORD` (e opcionalmente `INTEGRATIONS_ENCRYPTION_KEY`).
3. [ ] `npm run db:create` → `npm run db:migrate` → `npm run db:seed`.
4. [ ] `npm run build` → subir a app (`npm run start` ou PM2/systemd).
5. [ ] Subir o worker em processo separado (`tsx src/workers/runner.ts` ou `npm run worker:dev`).
6. [ ] Reverse proxy (Nginx/Caddy) com HTTPS apontando para a porta da app.
7. [ ] Testar: `GET https://seu-dominio.com/api/health` (esperado: `db`, `redis`, `worker` ok).
8. [ ] Login em `/admin-login` com o email/senha do seed; cadastrar Evolution em Admin → Integrações.

Referência completa de variáveis e credenciais: `.env.example` e `docs/CONFIG_CREDENTIALS.md`. Passo a passo local: `docs/GETTING_STARTED.md`. **Deploy com Docker e Portainer:** `docs/DOCKER_PORTAINER.md`.
