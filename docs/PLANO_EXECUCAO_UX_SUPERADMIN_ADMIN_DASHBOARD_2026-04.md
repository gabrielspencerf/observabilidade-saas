# Plano - Execucao UX Superadmin Admin Dashboard

## 1. Objetivo

Reorganizar a experiencia do produto em tres camadas formais:

- `superadmin`: plataforma e infraestrutura
- `admin`: operacao da empresa e carteira de clientes
- `dashboard`: operacao detalhada do cliente

Resultado esperado:

- navegacao alinhada ao modelo de negocio real
- Vysen contextual por camada
- dashboard cliente com melhor hierarquia e estados vazios
- home/boas-vindas mais leves e mais visuais

## 2. Etapas

### Etapa 1: Consolidar arquitetura de navegacao

Escopo:

- definir `superadmin`, `admin` e `dashboard` como superficies distintas
- mover conceitualmente a carteira para `admin`
- isolar o espaco tecnico do espaco de negocio
- preparar naming de rotas, shells e sidebars

Arquivos/pastas impactados:

- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/admin/page.tsx`
- `src/components/admin-shell.tsx`
- `src/components/admin-sidebar.tsx`
- `src/components/sidebar-navigation.tsx`
- `src/server/rbac/*`
- `src/server/tenancy/*`
- `src/db/schema/auth/*`
- `docs/REVISAO_ACESSO_E_RBAC.md`
- `docs/RESUMO_PROJETO.md`

Entregaveis:

- mapa novo de areas
- decisao de naming
- lista de rotas a manter, mover ou criar
- definicao preliminar de permissao para camada `admin`

### Etapa 2: Criar shell e menu da camada admin

Escopo:

- criar shell proprio para `admin`
- definir sidebar propria da empresa
- mover a carteira para a nova superficie
- separar visualmente `superadmin` de `admin`

Arquivos/pastas impactados:

- `src/components/admin-shell.tsx`
- `src/components/admin-sidebar.tsx`
- `src/components/sidebar-navigation.tsx`
- `src/app/(admin)/admin/agency/page.tsx`
- novos arquivos em `src/app/*` ou rotas equivalentes para a camada `admin`
- `src/server/admin/agency-dashboard.ts` ou sucessor com naming final

Entregaveis:

- home da empresa
- menu da empresa
- pagina de carteira fora do espaco tecnico
- linguagem visual distinta do superadmin

### Etapa 3: Reposicionar a Vysen por contexto

Escopo:

- reduzir peso da Vysen no superadmin
- criar entrada compacta e progressiva
- separar comportamento entre tecnico, empresa e cliente

Arquivos/pastas impactados:

- `src/components/vysen-bubble-chat.tsx`
- `src/components/dashboard-vysen-chat-dock.tsx`
- `src/components/dashboard-first-access-guide.tsx`
- `src/app/(admin)/admin/agent/page.tsx`
- `src/components/admin-vysen-knowledge-manager.tsx`
- APIs de chat e suporte da Vysen quando necessario

Entregaveis:

- Vysen tecnica no `superadmin`
- Vysen analitica no `admin`
- Vysen contextual no `dashboard`

### Etapa 4: Revisar dashboard do cliente

Escopo:

- reforcar hierarquia visual
- melhorar distribuicao de peso entre metricas, leitura e acao
- corrigir estados vazios
- reduzir sensacao de produto incompleto em telas com poucos dados

Arquivos/pastas impactados:

- `src/app/(dashboard)/dashboard/home/page.tsx`
- `src/app/(dashboard)/dashboard/conversations/page.tsx`
- `src/app/(dashboard)/dashboard/funnel/page.tsx`
- `src/app/(dashboard)/dashboard/products/page.tsx`
- `src/app/(dashboard)/dashboard/support/page.tsx`
- `src/app/(dashboard)/dashboard/settings/page.tsx`
- `src/components/dashboard-shell.tsx`
- `src/components/dashboard-sidebar.tsx`

Entregaveis:

- novo contrato de estados vazios
- revisao de densidade e espacamento
- agrupamento mais claro do menu lateral
- destaque melhor para setup, rotina e historico

### Etapa 5: Redesenhar home publica e boas-vindas

Escopo:

- reduzir peso textual da home
- aumentar impacto visual
- tornar onboarding e boas-vindas mais interativos
- introduzir mockups, vetores e simulacoes mais reais

Arquivos/pastas impactados:

- `src/app/page.tsx`
- `src/components/dashboard-first-access-guide.tsx`
- possiveis assets em `public/`
- `docs/design-system/*`

Entregaveis:

- hero mais forte
- narrativa visual mais clara
- onboarding com progressao mais viva
- menor dependencia de modal textual

### Etapa 6: Modelagem e acesso da camada admin

Escopo:

- formalizar no dominio a camada da empresa
- revisar relacoes de acesso alem de `super_admin` e `tenant`
- planejar schema para empresa operar varios clientes sem assumir tenant manualmente

Arquivos/pastas impactados:

- `src/db/schema/auth/*`
- migrations novas
- `src/server/rbac/*`
- `src/server/tenancy/*`
- `docs/db/SCHEMA_ORGANIZATION.md`
- `docs/REVISAO_ACESSO_E_RBAC.md`

Entregaveis:

- proposta de schema
- estrategia de migracao
- definicao de permissoes e memberships da empresa

## 3. Arquivos/pastas impactados

### Front

- `src/app/(admin)/*`
- `src/app/(dashboard)/*`
- `src/components/admin-*`
- `src/components/dashboard-*`
- `src/components/vysen-*`
- `src/app/page.tsx`

### Server e dominio

- `src/server/rbac/*`
- `src/server/tenancy/*`
- `src/server/admin/*`
- `src/db/schema/auth/*`

### Documentacao

- `docs/REVISAO_UX_ESTRUTURAL_2026-04.md`
- `docs/PLANO_EXECUCAO_UX_SUPERADMIN_ADMIN_DASHBOARD_2026-04.md`
- `docs/REVISAO_ACESSO_E_RBAC.md`
- `docs/RESUMO_PROJETO.md`
- `docs/db/SCHEMA_ORGANIZATION.md`
- `docs/log/REGISTRO.md`

## 4. Validacoes por etapa

- Etapa 1:
  - confirmar mapa final de camadas e nomenclatura
  - revisar impacto em RBAC e navegacao
- Etapa 2:
  - validar rotas, sidebars e shell no navegador
  - garantir que `admin` e `superadmin` nao compartilham o mesmo contexto visual
- Etapa 3:
  - validar abertura, peso e foco da Vysen em cada camada
  - checar se nao ha overlays competindo entre si
- Etapa 4:
  - revisar estados vazios e hierarquia visual nas telas principais
  - executar `npm run typecheck` e smoke de front se aplicavel
- Etapa 5:
  - validar a home em desktop e mobile
  - revisar tempo de leitura, CTA e demonstracao visual
- Etapa 6:
  - validar migrations, acesso e escopo de dados
  - revisar seguranca e documentacao de RBAC

## 5. Rollback

- Sinal de abortar:
  - perda de clareza entre areas
  - regressao de acesso
  - rotas quebradas entre `admin`, `superadmin` e `dashboard`
- Como reverter:
  - manter refatoracao por fases pequenas
  - nao migrar schema de acesso junto com mudanca visual inicial
  - concluir primeiro a separacao de shells e menus, depois modelagem de dominio

## 6. Definicao de pronto

- [ ] Camadas `superadmin`, `admin` e `dashboard` definidas e documentadas
- [ ] Menus e shells separados por contexto
- [ ] Vysen contextualizada por camada
- [ ] Dashboard cliente com hierarquia e estados vazios revisados
- [ ] Home e boas-vindas revisadas
- [ ] Impactos de acesso e schema documentados
- [ ] Validacoes executadas
- [ ] Registro atualizado
