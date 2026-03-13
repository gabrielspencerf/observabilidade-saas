# Paleta CL (Creative Lane)

Tema escuro com destaque em verde vibrante, aplicado em toda a aplicação. Referência visual: dashboards tipo CL Inbox / Luminous (tema escuro, métricas e CTAs em verde).

---

## 1. Tokens de cor

Definidos em `tailwind.config.ts` em `theme.extend.colors.cl`:

| Token | Valor | Uso |
|-------|--------|-----|
| `cl-bg` | `#121212` | Fundo principal da aplicação |
| `cl-card` | `#1C1C1C` | Cards, sidebar, header, painéis |
| `cl-surface` | `#1A1A1A` | Superfícies elevadas (inputs, listas, hover) |
| `cl-accent` | `#00C853` | Ações primárias, item ativo, métricas em destaque, links |
| `cl-accent-hover` | `#00E676` | Hover em botões e links de destaque |
| `cl-accent-muted` | `rgba(0, 200, 83, 0.15)` | Badges success, fundos sutis de destaque |
| `cl-text` | `#FAFAFA` | Texto primário |
| `cl-muted` | `#A1A1AA` | Texto secundário, labels, placeholders |
| `cl-border` | `#27272A` | Bordas de cards, inputs, separadores |

---

## 2. Uso no código

- **Body:** `theme-cl` no `<body>`; em `globals.css`, `body.theme-cl` usa `bg-cl-bg text-cl-text`.
- **Componentes:** Preferir classes `bg-cl-*`, `text-cl-*`, `border-cl-border` em vez de neutrals genéricos nas telas da aplicação.
- **Botões primários / CTA:** `bg-cl-accent` e `hover:bg-cl-accent-hover`.
- **Item de navegação ativo:** `bg-cl-accent text-white`.
- **Métricas em destaque:** `text-cl-accent` para valores numéricos importantes.
- **Cards e seções:** `bg-cl-card` ou `bg-cl-surface`, `border-cl-border`.

---

## 3. Relação com o Design System

- **Componentes UI:** Button (primary/cta), Badge, Card, Input e layouts (PageSection, StatsRow, ListTableHeader, ListRowCard) usam tokens `cl-*`.
- **Shells:** Dashboard (sidebar, shell, page-layout) e Admin (admin-shell) seguem a paleta CL.
- **Acessibilidade:** Contraste entre `cl-text` e `cl-bg` e entre `cl-accent` e fundos escuros atende WCAG AA para texto e elementos de UI.

---

## 4. Manutenção

- Alterar valores apenas em `tailwind.config.ts` (e, se necessário, em `globals.css` para variáveis customizadas).
- Novas telas devem usar os tokens `cl-*` para manter consistência.
- Documentação de componentes: [code-and-implementation.md](./code-and-implementation.md) e [components.md](./components.md).
