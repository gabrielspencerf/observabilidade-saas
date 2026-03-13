# Relação com o código

Como o Design System se reflete em Tailwind, componentes base, tokens e convenções de implementação. **Este é o mapeamento oficial código ↔ doc.**

---

## 1. Tailwind como fonte de verdade

- **Arquivo:** `tailwind.config.ts` (theme.extend).
- **Definido hoje:** `colors` com **paleta CL** (`cl`: bg, card, surface, accent, accent-hover, accent-muted, text, muted, border), além de primary, success, warning, error, info; `fontFamily` (sans: Inter, geist, jakarta), `borderRadius` (sm a 2xl), `boxShadow` (soft, soft-lg).
- **CSS global:** `src/app/globals.css` — classes `.sidebar`, `.scroll-hide`, `.beautiful-shadow`, `.glass-effect`; body com `.theme-cl` usa fundo e texto da paleta CL.
- **Uso:** Preferir tokens **cl-*** para a aplicação principal (tema escuro + verde). Ver [paleta-cl.md](paleta-cl.md).
- **Documentação:** Valores e uso em [foundations.md](foundations.md) e [paleta-cl.md](paleta-cl.md); alterações no theme devem ser refletidas aqui e nos docs.

---

## 2. Componentes base (primitivos)

**Localização:** `src/components/ui/`

| Componente | Arquivo | Uso |
|------------|---------|-----|
| Button | `ui/button.tsx` | Ações; variantes: primary, secondary, ghost, destructive, cta; tamanhos: sm, md, lg. |
| Input | `ui/input.tsx` | Campos de formulário; prop `error` para estado de erro. |
| Card, CardHeader, CardContent | `ui/card.tsx` | Blocos de conteúdo; borda e sombra padrão. |
| Badge | `ui/badge.tsx` | Labels, status; variantes: default, success, warning, error, info. |

**Export:** `src/components/ui/index.ts` — importar como `import { Button, Input, Card, Badge } from "@/components/ui"`.

**Regra:** Novos primitivos em `ui/` com variantes via props; documentar em [components.md](components.md).

---

## 3. Layout e estrutura de páginas

**Localização:** `src/components/layout/`

| Componente | Arquivo | Uso |
|------------|---------|-----|
| DashboardPageLayout | `layout/dashboard-page-layout.tsx` | Wrapper de conteúdo do dashboard: fundo `#E8F4F8`, container `max-w-[1200px]`, `space-y-10`. Já usado dentro de `DashboardShell`. |
| PageSection | `layout/page-section.tsx` | Seção em card branco: `rounded-3xl bg-white shadow`, padding; base Aura. |
| StatsRow | `layout/stats-row.tsx` | Linha de KPIs: ícone + valor + label uppercase; separadores entre itens. |
| ListTableHeader | `layout/list-table-header.tsx` | Cabeçalho de colunas de listagem: `rounded-full bg-neutral-50`, texto uppercase. |
| ListRowCard | `layout/list-row-card.tsx` | Linha de listagem em card com gradiente; variantes: violet, teal, amber, indigo, neutral. |

**Export:** `src/components/layout/index.ts`.

**Regra:** Novas telas de dashboard usam `PageSection` para blocos principais; listagens usam `ListTableHeader` + linhas (ou `ListRowCard`).

---

## 4. Shells e navegação

| Componente | Arquivo | Uso |
|------------|---------|-----|
| DashboardShell | `dashboard-shell.tsx` | Layout do dashboard usuário: sidebar (desktop) ou barra superior (mobile) + área de conteúdo com `DashboardPageLayout`. |
| DashboardSidebar | `dashboard-sidebar.tsx` | Sidebar (referência ZincMail): tema claro, cabeçalho conta + TenantSwitcher, CTA "Início", nav com ícones Lucide, rodapé email + Sair. Classes: `.sidebar`, `.beautiful-shadow`, `.scroll-hide`. |
| AdminShell | `admin-shell.tsx` | Layout do admin: header com nav (Início, Integrações, Observabilidade, Tenants, Usuários), email, Voltar ao site, Sair. |
| TenantSwitcher | `tenant-switcher.tsx` | Dropdown para trocar tenant (dashboard). |

**Regra:** Não alterar estrutura da sidebar sem atualizar [visual-references/sidebar.md](visual-references/sidebar.md).

---

## 5. Convenções de implementação

- **Ordem de classes (sugerida):** layout (flex, grid) → dimensões → espaçamento → tipografia → cores/bordas/sombra → estados (hover, focus).
- **Responsividade:** Prefixos `sm:`, `md:`, `lg:`; breakpoints padrão Tailwind.
- **Ícones:** `lucide-react`; tamanhos `h-4 w-4` ou `h-5 w-5` conforme contexto; decorativos com `aria-hidden="true"`.
- **Acessibilidade:** Foco visível; labels em inputs; não remover outline sem substituir.
- **Evitar:** `!important`; valores mágicos; duplicação de estilos — extrair componente ou token.

---

## 6. Manutenção

- Alterar `tailwind.config.ts` → atualizar [foundations.md](foundations.md) e, se for cor/logo, [brand-guidelines.md](brand-guidelines.md).
- Criar/alterar componente em `src/components/ui/` ou `layout/` → atualizar este doc e [components.md](components.md) se for primitivo.
- Novas telas → seguir [patterns.md](patterns.md) e [PADRAO_DESENVOLVIMENTO.md](../PADRAO_DESENVOLVIMENTO.md).
- Referências visuais (sidebar, dashboard-list) → manter classes e estrutura alinhadas aos HTMLs de referência; mudanças refletidas em visual-references/.
