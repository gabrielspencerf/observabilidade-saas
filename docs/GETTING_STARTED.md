# Subir a aplicação e testes práticos

Este documento descreve o que é necessário para rodar a aplicação localmente e iniciar os testes práticos. A estrutura (schema, migrations, seed, auth, dashboard, admin) está pronta para uso.

---

## Conclusão da revisão

**Sim, já é possível iniciar os testes práticos e subir a aplicação**, desde que:

1. PostgreSQL esteja rodando e o banco exista.
2. As variáveis obrigatórias estejam definidas em `.env` ou `.env.local`.
3. As migrations tenham sido aplicadas e o seed executado (para ter usuário e tenant).

Redis é **opcional** para o fluxo básico (login e navegação). **Redis é obrigatório** para workers, webhooks (Typebot/Evolution), observabilidade operacional e alguns endpoints administrativos com rate-limit.

---

## Pré-requisitos

- **Node.js** >= 20 (ver `package.json` → engines).
- **PostgreSQL** (qualquer versão compatível com o schema).
- **npm** (ou pnpm/yarn).

Obrigatório para webhooks e Google Ads (opcional só para login/dashboard/admin):

- **Redis** — obrigatório para: filas do worker, ingest de webhooks (Typebot/Evolution) e fluxo Google Ads (OAuth, sync). Sem Redis, essas funcionalidades não funcionam.

---

## Passo a passo

### 1. Variáveis de ambiente

Crie `.env` na raiz do projeto (ou `.env.local`; o Next.js carrega ambos). O script de seed usa `dotenv/config`, que lê `.env` por padrão.

**Mínimo para subir a app e testar login/dashboard:**

```env
# Obrigatório
DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_do_banco
SESSION_SECRET=uma-string-longa-aleatoria

# Opcional (padrões)
NODE_ENV=development
SESSION_COOKIE_NAME=session
```

**Para rodar o seed (criar usuário e tenant de teste):**

```env
# Além de DATABASE_URL e SESSION_SECRET
SEED_ADMIN_PASSWORD=suasenha
# Opcional: SEED_ADMIN_EMAIL=admin@example.com  SEED_ADMIN_NAME=Super Admin
# Opcional: SEED_TENANT_NAME=Tenant de Teste  SEED_TENANT_SLUG=tenant-teste
```

Exemplo completo de referência: `.env.example`.

### 2. Banco de dados

- Crie o banco no PostgreSQL (ex.: `createdb app` ou pelo cliente).
- Garanta que `DATABASE_URL` aponte para esse banco.

### 3. Migrations

Aplique as migrations (tabelas e enums):

```bash
npm run db:migrate
```

Ou, em desenvolvimento, se preferir sincronizar o schema direto sem arquivos de migration:

```bash
npm run db:push
```

Migrations existentes na pasta `src/db/migrations/`:

- `0000_concerned_blacklash.sql` — schema inicial (auth, integrations, raw-events, funnels-leads, conversations, snapshots, ai-alerts-audit).
- `0001_google_ads_currency_code.sql` — coluna `currency_code` em `google_ads_accounts`.
- `0002_app_global_config.sql` — tabela `app_global_config` (setup web).
- `0003_hardening_integrations.sql` — hardening e integrações (UAZAPI, dedup raw events, campos de segurança/metrics Typebot).

### 4. Seed (usuário e tenant iniciais)

Cria roles, permissions, tenant de teste e usuário admin com membership:

```bash
npm run db:seed
```

Exige `SEED_ADMIN_PASSWORD` (e opcionalmente `SEED_ADMIN_EMAIL`, `SEED_TENANT_NAME`, etc.). Idempotente: pode rodar mais de uma vez sem duplicar dados.

### 5. Subir a aplicação

```bash
npm run dev
```

A app estará em `http://localhost:3000` (ou na porta que o Next mostrar no terminal).

---

## Verificações rápidas

| Ação | Como verificar |
|------|----------------|
| App no ar | Abrir `http://localhost:3000` — landing com "Entrar na minha conta" e "Acesso administrador". |
| Banco/infra ok | `GET http://localhost:3000/api/health` — resposta 200 com `{ "ok": true, "db": "ok", "redis": "ok", "worker": "ok" }`. |
| Login usuário | "Entrar na minha conta" → `/login`; email e senha do seed → redireciona para `/dashboard`. |
| Login admin | "Acesso administrador" → `/admin-login`; só usuário super_admin entra; redireciona para `/admin`. |
| Dashboard | Após login usuário: `/dashboard` → `/dashboard/context` (escolher tenant) ou `/dashboard/home`. Sidebar com Início, Leads, Conversas, Google Ads, Funil. |
| Admin | Após login admin: `/admin` (hub Integrações, Observabilidade, Tenants, Usuários), incluindo integração UAZAPI e sync de métricas Typebot API. |

---

## O que funciona sem Redis

- Home, login, logout, sessão.
- Dashboard (home, leads, conversas, funis, contexto de tenant).
- Admin (tenants, usuários, memberships).
- API de contexto (tenants, troca de tenant).
- Health check.

Redis **não** é importado no startup da aplicação; só é usado quando alguma rota ou job chama `createRedisClient()`. Portanto, não definir `REDIS_URL` não impede a app de subir.

## O que exige Redis

- **Worker** (`npm run worker:dev`): filas Redis + retry/backoff + DLQ.
- **Google Ads:** callback OAuth (`/api/google-ads/auth/callback`), sync (`/api/google-ads/sync/[accountId]`), estado pendente.
- **Webhooks:** ingest de Typebot e Evolution (enfileiramento de jobs).

Para testes que envolvam apenas login, dashboard e admin, **Redis pode ficar em branco**.

---

## Outras variáveis (opcionais para testes iniciais)

- **CONFIG_ENCRYPTION_KEY:** Necessária apenas se o setup web gravar valores sensíveis em `app_global_config`. Para apenas subir e testar telas, pode omitir.
- **BOOTSTRAP_SUPER_ADMIN_***:** Documentado em `docs/SETUP_BOOTSTRAP_ARCHITECTURE.md`; o seed Base 1 já cria o admin com `SEED_ADMIN_*`. O bootstrap é uma alternativa “uma vez” quando não há super_admin; para testes, o seed é suficiente.
- **GOOGLE_ADS_*:** Só necessárias para conectar contas Google Ads e sync; não bloqueiam subir a app.
- **NEXT_PUBLIC_APP_URL:** Útil para redirects e OAuth; em dev local pode ser `http://localhost:3000`.

---

## Resumo

1. **Estrutura:** Pronta (schema, migrations, seed, auth, dashboard, admin, design system doc).
2. **Para subir:** `.env` com `DATABASE_URL` e `SESSION_SECRET`; banco criado; `db:migrate` (ou `db:push`); `db:seed` com `SEED_ADMIN_PASSWORD`; `npm run dev`.
3. **Testes práticos:** Login, seleção de tenant, dashboard home, leads, conversas, funis, admin — todos utilizáveis sem Redis. Para workers e integrações (Google Ads, webhooks), configure Redis e as variáveis correspondentes.

Se algo falhar (migration, seed ou health), verifique os erros no terminal e a conectividade com o PostgreSQL; a mensagem costuma indicar o próximo passo.

---

## Padrão de desenvolvimento

Para desenvolver novas telas, componentes ou alterar o front, use o **documento canônico** [docs/PADRAO_DESENVOLVIMENTO.md](PADRAO_DESENVOLVIMENTO.md). Ele define:

- Rotas e sessões (usuário vs admin, entradas de login).
- Estrutura de pastas e onde colocar páginas e componentes.
- Uso obrigatório do Design System (`src/components/ui/`, `src/components/layout/`, sidebar, shells).
- Checklists para nova tela e novo componente.
- Referências (design-system, patterns, code-and-implementation).

O Design System está em [docs/design-system/](design-system/); o mapeamento código ↔ doc em [docs/design-system/code-and-implementation.md](design-system/code-and-implementation.md).

---

## Log de erros e soluções

Problemas encontrados durante o projeto (inicialização, ambiente, build, runtime) estão documentados em **[docs/log/](log/)**. Ao resolver um erro novo, vale registrar em [docs/log/REGISTRO.md](log/REGISTRO.md) para referência futura.
