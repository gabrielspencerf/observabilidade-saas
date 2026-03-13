# Foundations

Base visual do sistema: tipografia, cores, espaçamento, tokens e regras de acessibilidade.

---

## 1. Tipografia

### 1.1 Família de fontes

| Uso | Fonte | Fallback | Notas |
|-----|-------|----------|--------|
| [PLACEHOLDER: Títulos e UI] | [A definir — ex.: Inter, system-ui] | [A definir] | [A definir] |
| [PLACEHOLDER: Corpo] | [A definir] | [A definir] | [A definir] |
| Monospace | [A definir — ex.: monospace do sistema] | monospace | Código, IDs |

- **Implementação:** Definir em `tailwind.config.ts` (theme.extend.fontFamily) e/ou `globals.css`; documentar aqui o valor final.

### 1.2 Escala tipográfica

| Nome | Uso | Tamanho (rem / px) | Line height | Peso | Token / classe Tailwind |
|------|-----|--------------------|-------------|------|-------------------------|
| [PLACEHOLDER: Display] | Hero, marcas grandes | [A definir] | [A definir] | [A definir] | [A definir] |
| [PLACEHOLDER: H1] | Título de página | [A definir] | [A definir] | [A definir] | [A definir] |
| [PLACEHOLDER: H2] | Título de seção | [A definir] | [A definir] | [A definir] | [A definir] |
| [PLACEHOLDER: H3] | Subtítulo | [A definir] | [A definir] | [A definir] | [A definir] |
| Body / Base | Texto padrão | [A definir] | [A definir] | [A definir] | [A definir] |
| Small | Legendas, hints | [A definir] | [A definir] | [A definir] | [A definir] |
| Caption | Labels, badges | [A definir] | [A definir] | [A definir] | [A definir] |

### 1.3 Pesos (font-weight)

| Nome | Valor | Uso |
|------|-------|-----|
| Regular | 400 | Corpo padrão |
| Medium | 500 | Ênfase leve, labels |
| Semibold | 600 | Subtítulos, botões |
| Bold | 700 | Títulos, destaque |

- Documentar no código em `theme.extend.fontWeight` se customizado.

---

## 2. Paleta e tokens de cor

- Valores reais das cores devem estar alinhados com [brand-guidelines.md](./brand-guidelines.md).
- **Tokens no código:** Definir em `tailwind.config.ts` (theme.extend.colors) com nomes semânticos, ex.:
  - `primary`, `primary-hover`, `secondary`
  - `success`, `warning`, `error`, `info`
  - `neutral-50` … `neutral-900` para texto e fundos
- **Convenção:** Preferir classes semânticas (ex.: `text-primary`, `bg-surface`) em vez de cores brutas (ex.: `text-neutral-900`) quando o significado for "ação principal" ou "fundo de card".

---

## 3. Espaçamento

### 3.1 Escala de espaçamento

- Alinhar à escala do Tailwind (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96…) ou definir escala custom em `theme.extend.spacing`.
- **Documentar aqui** a escala adotada e quando usar cada passo (ex.: 4 = ícone interno, 16 = entre parágrafos, 24 = entre seções).

| Token / Classe | Valor (px) | Uso sugerido |
|----------------|-----------|--------------|
| [A definir] | [A definir] | [A definir] |

---

## 4. Border radius

| Nome | Valor | Uso |
|------|-------|-----|
| [PLACEHOLDER: sm] | [A definir — ex.: 4px] | Inputs, badges |
| [PLACEHOLDER: md] | [A definir — ex.: 8px] | Cards, botões |
| [PLACEHOLDER: lg] | [A definir — ex.: 12px] | Modais, painéis |
| [PLACEHOLDER: full] | [A definir — ex.: 9999px] | Pills, avatares |

- Refletir em `theme.extend.borderRadius` no Tailwind.

---

## 5. Sombras (shadows)

| Nome | Valor / descrição | Uso |
|------|-------------------|-----|
| [PLACEHOLDER: sm] | [A definir] | Cards em repouso |
| [PLACEHOLDER: md] | [A definir] | Dropdowns, popovers |
| [PLACEHOLDER: lg] | [A definir] | Modais, overlays |

- Refletir em `theme.extend.boxShadow` no Tailwind.

---

## 6. Ícones

- **Biblioteca:** [PLACEHOLDER: ex. Lucide React, Heroicons — atualmente o projeto usa Lucide.]
- **Tamanhos padrão:** [A definir — ex.: 16px (sm), 20px (md), 24px (lg).]
- **Regras:** Manter espessura de traço e estilo (outline vs solid) consistente; usar mesma biblioteca em toda a UI.
- **Acessibilidade:** Ícones decorativos devem ter `aria-hidden="true"`; ícones que transmitem informação devem ter texto alternativo (aria-label ou sr-only).

---

## 7. Breakpoints (responsividade)

| Nome | Min-width | Uso |
|------|-----------|-----|
| sm | [A definir — ex.: 640px] | Mobile landscape / tablet portrait |
| md | [A definir — ex.: 768px] | Tablet |
| lg | [A definir — ex.: 1024px] | Desktop |
| xl | [A definir — ex.: 1280px] | Desktop largo |
| 2xl | [A definir — ex.: 1536px] | Telas grandes |

- Alinhar a `theme.screens` no Tailwind; documentar aqui os valores finais.

---

## 8. Contraste e acessibilidade

- **Texto normal:** Contraste mínimo **4.5:1** contra o fundo (WCAG AA).
- **Texto grande (≥ 18px ou 14px bold):** Mínimo **3:1**.
- **Elementos de UI e gráficos:** Mínimo **3:1** contra fundos adjacentes.
- **Foco visível:** Todo elemento interativo deve ter estado de foco visível (outline ou equivalente); não remover outline sem substituir por indicador claro.
- **Documentar:** Quais combinações texto/fundo são aprovadas (ex.: texto primário em fundo card) e quais evitar.

---

## 9. Relação com o código

- **Guia completo:** Ver [code-and-implementation.md](./code-and-implementation.md) para Tailwind, componentes base, tokens e convenções de implementação.
- **Tailwind:** Todas as escalas (cores, espaçamento, radius, sombras, fontes, breakpoints) devem estar em `tailwind.config.ts` como única fonte de verdade; este doc descreve o significado e uso de cada token.
- **CSS customizado:** Se houver variáveis em `globals.css`, listar aqui e explicar quando usar em vez de classes Tailwind.
- **Atualização:** Ao alterar o theme no código, atualizar este documento e, se necessário, [brand-guidelines.md](./brand-guidelines.md).
