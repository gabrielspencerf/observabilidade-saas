# Referências visuais

Esta pasta reúne **padrões de interface** extraídos de referências externas (Sidebar, Dashboard-list, Glass-effect) para uso consistente na aplicação. Os arquivos de origem estão em `[caminho externo]`; aqui ficam a documentação e o manual de uso vivo.

---

## Origen das referências

| Referência | Localização | Uso na aplicação |
|------------|-------------|-------------------|
| **Sidebar (ZincMail)** | `c:\Users\gabri\Desktop\Asimov\referencias\sidebar` | Navegação lateral, conta, labels, storage, botão primário (Compose). **Código APP:** `src/components/dashboard-sidebar.tsx` (tema claro, ícones Lucide, CTA Início, nav com beautiful-shadow). |
| **Dashboard-list (Aura)** | `c:\Users\gabri\Desktop\Asimov\referencias\dashboard-list` | Listagens com cabeçalho de colunas, cards de linha, stats, badges, CTAs. **Código APP:** `src/components/layout/` (DashboardPageLayout, PageSection, StatsRow, ListTableHeader, ListRowCard); fundo `#E8F4F8`, container `max-w-[1200px]`. |
| **Design system Aura** | `c:\Users\gabri\Desktop\Asimov\design systems\ai-automation-17.aura.build` | Tipografia, cores, componentes, layout (design-system.html + index.html). |
| **Glass-effect** | `c:\Users\gabri\Desktop\Asimov\referencias\glass-effect` | Cards com vidro (blur), gradientes, divisores, tags, estatísticas em destaque. |

---

## Conteúdo desta pasta

| Arquivo | Conteúdo |
|---------|----------|
| [README.md](./README.md) | Este índice e origem das referências. |
| [sidebar.md](./sidebar.md) | Padrões extraídos: estrutura, classes, componentes, cores, ícones. |
| [dashboard-list.md](./dashboard-list.md) | Padrões extraídos: listagem, stats, cards, badges, layout. |
| [glass-effect.md](./glass-effect.md) | Padrões extraídos: glass, tema, tipografia, componentes. |
| [design-system.html](./design-system.html) | **Manual de uso vivo**: uma única página com seções navegáveis (Tipografia, Cores, Componentes, Layout, Motion, Ícones) reutilizando as mesmas classes e comportamentos das referências. Abrir no navegador para visualizar. |

---

## Como usar

1. **Consultar padrões:** Use [sidebar.md](./sidebar.md), [dashboard-list.md](./dashboard-list.md) e [glass-effect.md](./glass-effect.md) para copiar classes, estruturas e regras sem reinventar.
2. **Ver ao vivo:** Abra [design-system.html](./design-system.html) no navegador para ver exemplos canônicos de cada padrão.
3. **Alinhar com o Design System:** Cores, tipografia e tokens usados nas referências devem ser consolidados em [../foundations.md](../foundations.md) e [../brand-guidelines.md](../brand-guidelines.md) quando a marca for definida.
4. **Manter vivo:** Ao alterar um padrão na aplicação, atualizar o doc correspondente e, se necessário, o `design-system.html`.

---

## Convenções

- **Não redesenhar:** A documentação e o HTML reutilizam nomes de classes, animações e estruturas das referências; não inventar novos estilos.
- **Uma fonte por padrão:** Sidebar = Geist + Lucide + Tailwind; Dashboard-list = Inter + Lucide + Tailwind; Glass = Plus Jakarta Sans + Inter + Font Awesome + Tailwind custom.
- **Placeholders:** Valores de marca (nome do produto, cores finais) podem permanecer como placeholders até a definição da identidade.
