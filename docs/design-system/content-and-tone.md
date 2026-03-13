# Content and Tone

Voz, tom e padrões de conteúdo (microcopy, mensagens de erro, labels e acessibilidade de texto).

---

## 1. Voz da marca

- **Voz:** [PLACEHOLDER: ex. "Profissional e direta", "Amigável e técnica", "Objetiva e orientada a resultado".]
- **Princípios:**
  - [PLACEHOLDER: ex. Clareza — preferir frases curtas e termos conhecidos.]
  - [PLACEHOLDER: ex. Consistência — mesmo termo para o mesmo conceito em toda a UI.]
  - [PLACEHOLDER: ex. Respeito — evitar culpar o usuário em erros.]
  - [PLACEHOLDER: ex. Concisão — evitar texto desnecessário em botões e labels.]

---

## 2. Microcopy

### 2.1 Botões e ações

- Use verbo no imperativo: "Salvar", "Conectar", "Voltar", "Excluir".
- Evite "Clique aqui"; prefira o que será feito: "Conectar conta Google Ads".
- Destrutivo: ser explícito — "Excluir conta" em vez de só "Excluir" quando o contexto não for óbvio.

### 2.2 Labels de formulário

- Nome do campo em poucas palavras; "opcional" entre parênteses quando for o caso.
- Consistência: mesmo nome para o mesmo dado (ex.: "E-mail" sempre "E-mail", não alternar com "Email").

### 2.3 Títulos de página e seção

- Página: substantivo ou frase curta que descreva o conteúdo (ex.: "Leads", "Configuração").
- Seção: substantivo ou frase curta (ex.: "Dados principais", "UTM (atribuição)").

### 2.4 Placeholders

- Exemplos curtos de valor esperado; não substituir o label.
- Evitar placeholder como única explicação do campo (acessibilidade).

---

## 3. Mensagens de erro

- **Regra:** Mensagem específica e acionável quando possível.
- **Evitar:** "Erro ao salvar", "Algo deu errado" sem contexto.
- **Preferir:** "E-mail já está em uso" ou "Preencha o nome antes de salvar".
- **Formulário:** Erro próximo ao campo; resumo no topo se houver vários erros.
- **Idioma:** [PLACEHOLDER: ex. Português (pt-BR) em toda a UI.]

---

## 4. Estados e feedback

- **Sucesso:** Mensagem curta e positiva (ex.: "Conta conectada com sucesso.").
- **Carregando:** Indicador claro (spinner ou skeleton); evitar texto longo.
- **Vazio:** Ver [patterns: Estados vazios](./patterns.md#5-estados-vazios); tom orientador, não culpabilizante.

---

## 5. Acessibilidade de texto

- **Links:** Evitar "Saiba mais" sozinho; preferir "Saiba mais sobre atribuição" ou texto que descreva o destino.
- **Ícones:** Ícones com significado devem ter texto visível ou aria-label; ícones decorativos com aria-hidden="true".
- **Headings:** Ordem lógica (H1 → H2 → H3); não pular níveis.

---

## 6. Glossário (opcional)

Manter lista de termos preferidos para consistência:

| Evitar | Preferir |
|--------|----------|
| [A definir] | [A definir] |
| [A definir] | [A definir] |

---

## 7. Atualização

- Revisar este doc quando forem definidos voz e tom oficiais da marca; substituir placeholders e alinhar exemplos ao produto.
