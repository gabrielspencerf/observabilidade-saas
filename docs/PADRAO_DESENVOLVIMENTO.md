# Padrão de desenvolvimento do app

Documento canônico que define como o aplicativo é construído e mantido. **Toda alteração de front, nova tela ou novo componente deve seguir este padrão.**

---

## 1. Visão geral

- **Stack:** Next.js 15 (App Router), React 19, Tailwind CSS, Drizzle (Postgres), autenticação por sessão (cookie).
- **Duas áreas distintas:** **Usuário** (dashboard do tenant, dados da conta) e **Admin** (super_admin: integrações, observabilidade, tenants, usuários). Acesso por páginas de login separadas (`/login` e `/admin-login`).
- **Design System:** Visual e UX seguem [docs/design-system](design-system/README.md) e as referências visuais (Sidebar ZincMail, Dashboard-list Aura). Componentes e layouts estão em `src/components/`; não inventar estilos fora do sistema.

---

## 2. Rotas e sessões

Existem **três grupos de rotas server-side** em `src/app/`, coexistindo intencionalmente:

| Grupo (App Router) | Segmento URL | Entrada | Quem acessa |
|---|---|---|---|
| `(dashboard)` | `/dashboard/*` | `/login` → `/dashboard` | Usuário com membership em algum tenant |
| `(admin)` (legado) | `/admin/*` | `/admin-login` → `/admin` | `super_admin` global. Em consolidação com `(superadmin)`. |
| `(superadmin)` | `/superadmin/*` | `/admin-login` (mesmo) | `super_admin` global — área operacional consolidada (tenants, usuários, integrações, observabilidade, agente). |
| `(company-admin)` | `/admin/*` | `/login` → `/admin` (do tenant) | Admin de um tenant específico (escopo limitado ao tenant atual). |

> **Atenção — `/admin/*`** é segmento URL compartilhado por `(admin)` e
> `(company-admin)`. O middleware roteia por sessão/role; quem é `super_admin`
> global cai em `(admin)`/`(superadmin)`, quem é admin de tenant cai em
> `(company-admin)`. Plano de longo prazo: descontinuar `(admin)` legado em
> favor de `(superadmin)` + `(company-admin)` separados, conforme
> [PLANO_EXECUCAO_UX_SUPERADMIN_ADMIN_DASHBOARD_2026-04.md](PLANO_EXECUCAO_UX_SUPERADMIN_ADMIN_DASHBOARD_2026-04.md).

- **Landing (`/`):** Dois CTAs: "Entrar na minha conta" → `/login`, "Acesso administrador" → `/admin-login`.
- **Middleware:** Protege `/dashboard/*`, `/admin/*` e `/superadmin/*`; redireciona para `/login` ou `/admin-login` conforme a rota. Rotas públicas: `/`, `/login`, `/admin-login`, `/forbidden`, `/api/auth/*`, `/api/health`.
- **Não** exibir link para Admin dentro do dashboard do usuário.
- **RBAC no dashboard:** Sessão + membership continua obrigatório; com **tenant selecionado**, o layout exige `dashboard:read`. As rotas em `/api/dashboard/*` aplicam permissões por recurso (`leads:*`, `funnels:*`, etc.) via `requireDashboardApiAuth` — ver [REVISAO_ACESSO_E_RBAC.md](REVISAO_ACESSO_E_RBAC.md). A sidebar ainda não oculta itens por permissão (melhoria de UX pendente).

---

## 3. Estrutura de pastas (front e app)

```
src/
├── app/                    # App Router
│   ├── page.tsx           # Landing
│   ├── layout.tsx         # Root layout
│   ├── login/              # Acesso usuário
│   ├── admin-login/        # Acesso admin
│   ├── forbidden/          # 403
│   ├── (dashboard)/        # Grupo: rotas do usuário (não altera URL)
│   │   └── dashboard/      # Segmento /dashboard
│   │       ├── page.tsx    # Redireciona para context ou home
│   │       ├── context/    # Escolha de tenant
│   │       ├── home/
│   │       ├── leads/      # Lista, kanban, [id], [id]/edit
│   │       ├── contacts/
│   │       ├── opportunities/
│   │       ├── conversations/
│   │       ├── google-ads/
│   │       ├── funnel/     # + funnel/config
│   │       ├── products/
│   │       ├── complaints/
│   │       ├── onboarding/
│   │       ├── pagespeed/
│   │       └── settings/
│   ├── (admin)/            # LEGADO: hub super_admin antigo em /admin/* (em consolidação com (superadmin)/(company-admin))
│   │   └── admin/
│   │       ├── integrations/
│   │       ├── observability/
│   │       ├── tenants/
│   │       ├── users/
│   │       ├── worker-pipeline/
│   │       └── agent/
│   ├── (superadmin)/       # Hub consolidado de super_admin em /superadmin/*
│   │   └── superadmin/     # Tenants, usuários, integrações, observabilidade, agente
│   └── (company-admin)/    # Admin de tenant em /admin/* (escopo limitado ao tenant atual)
│       └── admin/
├── components/
│   ├── ui/                 # Primitivos: Button, Input, Card, Badge (Design System)
│   ├── layout/             # Layout de páginas: DashboardPageLayout, PageSection, StatsRow, ListTableHeader, ListRowCard
│   ├── dashboard-sidebar.tsx
│   ├── dashboard-shell.tsx
│   ├── admin-shell.tsx
│   └── tenant-switcher.tsx
├── server/                 # Lógica server-side (auth, dashboard, admin, integrations)
├── db/                     # Schema Drizzle, migrations
├── lib/                    # Utilitários (csv, etc.)
└── middleware.ts
```

- **Novas páginas de dashboard:** Dentro de `(dashboard)/dashboard/<nome>/page.tsx`; usar o layout que já inclui `DashboardShell` + `DashboardPageLayout`.
- **Novas páginas de admin:** Dentro de `(admin)/admin/<nome>/page.tsx`; usar o layout que já inclui `AdminShell`.

---

## 4. Design System e uso obrigatório

### 4.1 Documentação de referência

- **[design-system/README.md](design-system/README.md)** — Índice e objetivos.
- **[design-system/code-and-implementation.md](design-system/code-and-implementation.md)** — Mapeamento código ↔ doc (Tailwind, componentes, tokens).
- **[design-system/patterns.md](design-system/patterns.md)** — Padrões de tela (dashboard, listagens, formulários, erros).
- **[design-system/visual-references/](design-system/visual-references/)** — Sidebar (ZincMail), Dashboard-list (Aura); base visual do app.

### 4.2 Onde está cada coisa no código

| Uso | Onde | Observação |
|-----|------|------------|
| **Tokens Tailwind** | `tailwind.config.ts` (theme.extend), `src/app/globals.css` | Cores, fontFamily, borderRadius, boxShadow; classes `.sidebar`, `.scroll-hide`, `.beautiful-shadow`. |
| **Botões, inputs, cards, badges** | `src/components/ui/` | Importar de `@/components/ui`; usar variantes (variant, size) em vez de classes soltas. |
| **Layout de conteúdo (dashboard)** | `src/components/layout/` | `DashboardPageLayout` (fundo + container), `PageSection`, `StatsRow`, `ListTableHeader`, `ListRowCard`. O shell já envolve o conteúdo em `DashboardPageLayout`. |
| **Sidebar (usuário)** | `src/components/dashboard-sidebar.tsx` | Tema claro (zinc-100), CTA "Início", nav com ícones Lucide; não alterar estrutura sem atualizar [visual-references/sidebar.md](design-system/visual-references/sidebar.md). |
| **Shell admin** | `src/components/admin-shell.tsx` | Nav: Início, Integrações, Observabilidade, Tenants, Usuários. |

### 4.3 Regras de implementação

1. **Novas telas de dashboard:** Usar `PageSection` para blocos em card branco; `StatsRow` para KPIs no topo; `ListTableHeader` + linhas (ou `ListRowCard`) para listagens; fundo e container já vêm do `DashboardPageLayout` no shell.
2. **Formulários:** Usar `Input`, `Button` de `@/components/ui`; labels visíveis; mensagens de erro inline; seguir [patterns.md](design-system/patterns.md) (formulários).
3. **Cores e espaçamento:** Preferir tokens do theme e escala Tailwind (`p-4`, `gap-6`, `rounded-xl`); evitar valores arbitrários exceto quando a referência visual exigir (ex.: `bg-[#E8F4F8]` no layout Aura).
4. **Ícones:** Lucide React (`lucide-react`); tamanho consistente (ex.: `h-4 w-4`, `h-5 w-5` na sidebar); ícones decorativos com `aria-hidden="true"`.
5. **Acessibilidade:** Contraste e foco visível; labels associados a inputs; não remover outline sem substituir.

---

## 5. Convenções gerais de código

- **Idioma:** Código e comentários em português quando forem específicos do negócio; nomes de variáveis/rotas em inglês quando for técnico (ex.: `getDashboardTenantContext`, rota `/dashboard/home`).
- **Arquivos longos:** Refatorar quando passar de ~200–300 linhas; dividir em componentes ou funções menores.
- **Duplicação:** Evitar; extrair componente ou helper reutilizável.
- **Ambientes:** Comportamento deve considerar dev, test e prod; não simular dados em dev/prod (apenas em testes).
- **Segurança:** Validação e checagem de permissão sempre no servidor; UI apenas para experiência.

---

## 6. Checklist: nova tela no dashboard

- [ ] Página em `(dashboard)/dashboard/<nome>/page.tsx` (ou subpastas).
- [ ] Se precisar de tenant/sessão: usar `getDashboardTenantContext()` no layout ou na página.
- [ ] Conteúdo dentro de `PageSection` para blocos em card; usar `StatsRow` se houver KPIs; listagens com `ListTableHeader` e linhas no padrão Aura (ou tabela simples com classes consistentes).
- [ ] Links de navegação para `/dashboard/*` (já existentes na sidebar).
- [ ] Estados vazios e erros seguindo [patterns.md](design-system/patterns.md) e [content-and-tone.md](design-system/content-and-tone.md).
- [ ] Sem link para Admin na tela do usuário.

---

## 7. Checklist: novo componente de UI

- [ ] Primitivo em `src/components/ui/` com variantes (props); export em `ui/index.ts`.
- [ ] Layout/composto em `src/components/layout/` ou componente específico em `components/`.
- [ ] Estilos com Tailwind e tokens do theme; sem valores mágicos.
- [ ] Documentar em [components.md](design-system/components.md) (nome, quando usar, variantes, exemplos).
- [ ] Acessibilidade: foco, labels, roles.

---

## 8. Referências rápidas

| Necessidade | Documento / Código |
|-------------|---------------------|
| Subir o app, env, banco | [GETTING_STARTED.md](GETTING_STARTED.md) |
| Design System completo | [design-system/README.md](design-system/README.md) |
| Onde está cada componente | [design-system/code-and-implementation.md](design-system/code-and-implementation.md) |
| Padrões de tela | [design-system/patterns.md](design-system/patterns.md) |
| Referências visuais (Sidebar, Aura) | [design-system/visual-references/](design-system/visual-references/) |
| Plano de ação do front | [PLANO_ACAO_FRONT.md](PLANO_ACAO_FRONT.md) |
| Erros e soluções | [log/REGISTRO.md](log/REGISTRO.md) |
| Revisão geral, env, segurança no Git | [REVISAO_GERAL_2026-03.md](REVISAO_GERAL_2026-03.md) |

---

**Atualização:** Ao mudar estrutura de rotas, componentes ou convenções, atualizar este documento e os referenciados (design-system, code-and-implementation) para manter o padrão único.
