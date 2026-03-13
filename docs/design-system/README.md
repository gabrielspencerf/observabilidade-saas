# Design System e Brand Guidelines

Documentação formal de identidade visual, padrões de interface e uso consistente dos componentes do produto. Base para manter consistência visual e estrutural em toda a aplicação.

---

## Objetivo

- **Identidade:** Marca e diretrizes de uso (logo, cores, tom).
- **Fundações:** Tipografia, paleta, espaçamento, tokens e acessibilidade.
- **Componentes:** Catálogo, variantes, estados e boas práticas.
- **Padrões:** Composição de telas (dashboard, listagens, formulários, erros, etc.).
- **Código:** Reflexo em Tailwind, componentes e convenções de implementação.

---

## Estrutura da documentação

| Arquivo | Conteúdo |
|---------|----------|
| [brand-guidelines.md](./brand-guidelines.md) | Manual de marca: propósito, logo, cores, usos corretos e incorretos. |
| [foundations.md](./foundations.md) | Base visual: tipografia, escala, cores, espaçamento, radius, sombras, ícones, breakpoints, acessibilidade, tokens. |
| [components.md](./components.md) | Como documentar componentes: quando usar, variantes, estados, exemplos. |
| [patterns.md](./patterns.md) | Padrões de tela: dashboard, listagens, detalhes, formulários, setup, vazios, erros, permissões. |
| [content-and-tone.md](./content-and-tone.md) | Voz, tom e padrões de conteúdo (microcopy, mensagens, erros). |
| [code-and-implementation.md](./code-and-implementation.md) | Relação com o código: Tailwind, componentes base, tokens, convenções de implementação. |
| [paleta-cl.md](./paleta-cl.md) | **Paleta CL:** tema escuro + verde vibrante; tokens `cl-*`, uso em toda a aplicação. |
| [visual-references/](./visual-references/) | **Referências visuais:** padrões extraídos (Sidebar, Dashboard-list, Glass-effect) e [manual de uso vivo](visual-references/design-system.html) em HTML. |
| [README.md](./README.md) | Este índice e orientação para manter o Design System vivo. |
| [../PADRAO_DESENVOLVIMENTO.md](../PADRAO_DESENVOLVIMENTO.md) | **Padrão de desenvolvimento:** documento canônico do app (rotas, componentes, checklists, referências). |
| [../PLANO_ACAO_FRONT.md](../PLANO_ACAO_FRONT.md) | **Plano de ação:** revisão do front, separação Admin/Usuário, uniformização visual e fases de implementação. |

---

## Como manter vivo

1. **Atualizar ao mudar a UI:** Sempre que alterar cores, tipografia, componentes ou padrões de tela, atualizar o doc correspondente e, se aplicável, os tokens no código (Tailwind / CSS).
2. **Revisar antes de novas telas:** Consultar [patterns.md](./patterns.md) e [components.md](./components.md) antes de criar novas páginas ou componentes.
3. **Placeholders:** Itens marcados com `[PLACEHOLDER]` ou tabelas "A definir" devem ser preenchidos quando a marca e as decisões visuais forem fechadas.
4. **Uma fonte de verdade:** Cores, espaçamentos e tokens usados no código (Tailwind/theme) devem estar documentados em [foundations.md](./foundations.md); divergências devem ser resolvidas (código ou doc).
5. **Revisão periódica:** A cada release ou sprint de UI, checar se a documentação ainda reflete o produto e atualizar exemplos e screenshots se necessário.
6. **Implementação:** Ao alterar theme ou componentes, seguir as convenções em [code-and-implementation.md](./code-and-implementation.md) e manter doc e código alinhados.
7. **Referências visuais:** Ao adotar padrões de [visual-references/](./visual-references/), usar as mesmas classes e estruturas documentadas; atualizar o [design-system.html](visual-references/design-system.html) se novos padrões forem incorporados.

---

## Convenções

- **Placeholders** são indicados entre colchetes, ex.: `[NOME_DA_MARCA]`, `[COR_PRIMÁRIA]`.
- Valores "A definir" em tabelas devem ser preenchidos quando a decisão for tomada.
- Referências ao código usam caminhos relativos ao repositório (ex.: `src/components/`, `tailwind.config.ts`).
