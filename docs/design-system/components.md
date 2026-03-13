# Components

Como documentar e usar os componentes do Design System. Cada componente deve seguir a estrutura abaixo para manter consistência na documentação e na implementação.

---

## 1. Template de documentação de componente

Para cada componente (Button, Input, Card, etc.), preencher:

### 1.1 Nome e descrição

- **Nome:** [ex.: Botão]
- **Descrição em uma linha:** [ex.: Dispara uma ação ou navegação.]
- **Onde está no código:** [ex.: `src/components/ui/button.tsx`]

### 1.2 Quando usar

- [Bullets com cenários de uso recomendados.]

### 1.3 Quando não usar

- [Bullets com anti-padrões — ex.: "Não usar como link de navegação se a ação for apenas mudar de página; usar link estilizado."]

### 1.4 Variantes

| Variante | Uso | Classe / prop |
|----------|-----|----------------|
| [ex.: Primário] | [ex.: Ação principal da tela] | [ex.: `variant="primary"`] |
| [ex.: Secundário] | [ex.: Ações secundárias] | [ex.: `variant="secondary"`] |
| [ex.: Ghost] | [ex.: Ações terciárias, toolbar] | [ex.: `variant="ghost"`] |
| [ex.: Destrutivo] | [ex.: Excluir, ações irreversíveis] | [ex.: `variant="destructive"`] |

### 1.5 Tamanhos (se aplicável)

| Tamanho | Uso | Classe / prop |
|---------|-----|----------------|
| sm | [ex.: Dentro de tabelas, compacto] | [A definir] |
| md | [ex.: Padrão] | [A definir] |
| lg | [ex.: CTAs principais] | [A definir] |

### 1.6 Estados

- **Default:** [descrição]
- **Hover:** [descrição]
- **Focus:** [descrição — ex.: outline visível para acessibilidade]
- **Active / pressed:** [descrição]
- **Disabled:** [descrição]
- **Loading (se aplicável):** [descrição]

### 1.7 Boas práticas

- [Bullets: acessibilidade, uso com ícones, texto do botão, etc.]

### 1.8 Exemplos (código ou referência)

```tsx
// Exemplo mínimo
<Button variant="primary">Salvar</Button>
```

- [Link para Storybook ou página de exemplos, se houver.]

---

## 2. Lista de componentes a documentar

Preencher conforme os componentes forem criados ou padronizados:

| Componente | Arquivo | Documentado |
|------------|---------|--------------|
| Button | [A definir] | Não |
| Input / TextField | [A definir] | Não |
| Card | [A definir] | Não |
| Link | [A definir] | Não |
| Badge | [A definir] | Não |
| Table | [A definir] | Não |
| Modal / Dialog | [A definir] | Não |
| [Outros] | — | — |

---

## 3. Convenções gerais

- **Um componente, um propósito:** Evitar componentes que fazem muitas coisas; preferir composição (ex.: Card + CardHeader + CardContent).
- **Acessibilidade:** Sempre considerar teclado, screen readers e contraste; documentar requisitos de acessibilidade em "Boas práticas".
- **Estados:** Todo componente interativo deve ter estados documentados (hover, focus, disabled, loading quando fizer sentido).
- **Variantes no código:** Preferir props semânticas (ex.: `variant="primary"`) em vez de classes de estilo soltas no consumidor.
