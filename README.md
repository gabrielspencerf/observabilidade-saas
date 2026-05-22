# Observabilidade SaaS (Vysen)

Plataforma SaaS multi-tenant para operacao comercial e marketing, com foco em:

- observabilidade de leads e conversas;
- funil de vendas e analise de gargalos;
- integracoes com Google Ads, Meta Ads, Clarity, Typebot, Evolution e UAZAPI;
- apoio a decisao com Vysen Copilot.

Este repositorio contem app web (Next.js), APIs internas, worker assicrono e camada de dados (Drizzle + PostgreSQL).

## Stack principal

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS
- PostgreSQL + Drizzle ORM
- Redis (filas e jobs assincronos com implementacao interna em `src/workers/queue`)
- Autenticacao por sessao (cookie opaco)

## Funcionalidades principais

- Multi-tenancy com RBAC (tenant, usuario, membership, permissoes)
- Dashboard com leads, conversas, funil e canais
- Area admin para tenants, usuarios e integracoes
- Ingestao de webhooks e processamento assincrono via worker
- Auditoria e notificacoes por tenant (com feature flags)
- Copilot Vysen com fallback de modelo e telemetria

## Estrutura do projeto

```txt
src/
  app/           # rotas UI e API (App Router)
  components/    # componentes reutilizaveis
  server/        # regras de negocio, auth, integracoes, seguranca
  db/            # schema, migrations e seeds
  workers/       # consumidores de fila e jobs
docs/            # documentacao tecnica e operacional
scripts/         # scripts utilitarios de ambiente/banco
```

## Como rodar localmente

### 1) Pre-requisitos

- Node.js >= 20
- PostgreSQL
- Redis (obrigatorio para worker e integracoes assincronas)

### 2) Instalar dependencias

```bash
npm install
```

### 3) Configurar ambiente

Copie `.env.example` para `.env` (ou `.env.local`) e preencha no minimo:

- `DATABASE_URL`
- `SESSION_SECRET`

Para worker/integracoes, configure tambem:

- `REDIS_URL`

### 4) Preparar banco

```bash
npm run db:migrate
npm run db:seed
```

### 5) Subir aplicacao

```bash
npm run dev
```

App local: `http://localhost:3000`

## Runtime da Vysen

O copiloto da Vysen segue rodando com backend local da aplicação.
Também existe uma camada de abstração preparada para integração futura com Agno em `src/server/vysen/runtime`.

Variáveis planejadas:

- `VYSEN_AGNO_ENABLED`
- `VYSEN_AGNO_SERVICE_URL`
- `VYSEN_AGNO_SESSION_TABLE`
- `VYSEN_AGNO_MEMORY_TABLE`

### 6) (Opcional) Subir worker em paralelo

```bash
npm run worker:dev
```

## Scripts uteis

- `npm run dev` - sobe app em modo desenvolvimento
- `npm run build` - build de producao
- `npm run start` - start de producao
- `npm run lint` - lint do projeto
- `npm run typecheck` - checagem TypeScript
- `npm run smoke:web` - smoke estrutural de rotas e boundary web
- `npm run smoke:api` - smoke estrutural de auth/tenant/webhooks
- `npm run smoke:channels` - smoke local de Chatwoot/WhatsApp Cloud (raw event -> processor -> conversations/messages)
- `npm run smoke:worker` - smoke estrutural de filas/readiness/runner
- `npm run ci:verify` - pipeline minimo local (lint + typecheck + build + smokes)
- `npm run db:migrate` - aplica migrations
- `npm run db:seed` - popula dados iniciais
- `npm run db:studio` - abre Drizzle Studio

## Valor para o negocio

- Centralize operacao, marketing e vendas em uma unica visao.
- Transforme dados dispersos em prioridades claras para o time.
- Ganhe velocidade na tomada de decisao com apoio do Vysen Copilot.
- Melhore previsibilidade comercial com funil, sinais e indicadores em tempo real.

## Documentacao recomendada

- `docs/GETTING_STARTED.md` - bootstrap detalhado
- `docs/CONFIG_CREDENTIALS.md` - mapa de credenciais e variaveis
- `docs/SECURITY_ENDPOINTS_MAP.md` - superficie de endpoints criticos
- `docs/VYSEN_COPILOT.md` - modelos, fallback e limites do copilot
- `docs/AGNO_VYSEN_ARQUITETURA_2026-04.md` - desenho de sessão, memória e workflow com Agno
- `docs/PLANO_IMPLEMENTACAO_AGNO_VYSEN_2026-04.md` - rollout incremental dessa infraestrutura
- `docs/REVISAO_COMPLETA_APP_2026-03.md` - auditoria tecnica consolidada

## Status

Repositorio em evolucao continua com foco em:

- consistencia de UX dashboard/admin;
- robustez de seguranca por ambiente;
- escalabilidade de filas, ingestao e processamento de dados.
