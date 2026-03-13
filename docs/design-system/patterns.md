# Patterns

Padrões de tela e composição: estrutura de páginas, listagens, formulários, estados vazios, erros e permissões.

---

## 1. Dashboard / Hub

- **Objetivo:** Visão geral e pontos de entrada para as principais áreas.
- **Estrutura sugerida:**
  - Título da página (H1) e descrição curta.
  - Blocos ou cards por domínio (ex.: Resumo, Leads, Google Ads, Funil).
  - Ações rápidas ou links claros para listagens e configuração.
- **Comportamento:** Consistente com [components: Card](./components.md); usar espaçamento e hierarquia definidos em [foundations](./foundations.md).
- **Exemplo no projeto:** [ex.: `src/app/(dashboard)/home/page.tsx`]

---

## 2. Listagens

- **Objetivo:** Exibir lista de entidades (leads, conversas, contas, etc.) com busca/filtros e navegação para detalhe.
- **Estrutura sugerida:**
  - Título (H1) e opcionalmente descrição.
  - Barra de busca e/ou filtros (quando aplicável).
  - Tabela ou lista (componente Table ou lista de cards); colunas/atributos consistentes com o domínio.
  - Paginação ou "Carregar mais" quando houver muitos itens.
  - Link ou ação para "detalhe" em cada linha/item.
- **Estados:** Lista vazia (ver [Estados vazios](#5-estados-vazios)), loading, erro.
- **Exemplo no projeto:** [ex.: Leads, Conversas]

---

## 3. Detalhes (detalhe de entidade)

- **Objetivo:** Mostrar todas as informações relevantes de uma entidade (ex.: lead, conversa).
- **Estrutura sugerida:**
  - Caminho de volta (breadcrumb ou link "Voltar para X").
  - Título principal (nome da entidade ou identificador).
  - Seções em cards ou blocos (Dados principais, Histórico, etc.).
  - Ações contextuais (editar, excluir) quando aplicável.
- **Comportamento:** Apenas leitura por padrão; edição em linha ou formulário separado conforme padrão de formulários.
- **Exemplo no projeto:** [ex.: Lead detail, Conversation detail]

---

## 4. Formulários

- **Objetivo:** Coletar ou editar dados com validação e feedback claro.
- **Estrutura sugerida:**
  - Agrupamento lógico (fieldset ou seções).
  - Labels visíveis, placeholders opcionais; obrigatoriedade indicada (ex.: asterisco ou "opcional").
  - Mensagens de erro inline por campo e resumo no topo quando houver múltiplos erros.
  - Botões de ação no final (ex.: "Salvar", "Cancelar"); primário à direita ou conforme [brand].
- **Estados:** Default, focus, erro, disabled, submitting.
- **Acessibilidade:** label associado a cada input; erros vinculados ao campo (aria-describedby).

---

## 5. Setup / Configuração

- **Objetivo:** Configurar integrações ou parâmetros globais (ex.: /admin/setup).
- **Estrutura sugerida:**
  - Título "Configuração" ou "Setup".
  - Blocos por integração ou área (Google Ads, Typebot, Evolution); cada bloco com título e campos.
  - Valores sensíveis: não exibir em claro; placeholder (ex.: "••••••••") quando já preenchido; campo para substituir.
  - Botão "Salvar" por bloco ou "Salvar tudo"; feedback de sucesso ou erro.
- **Acesso:** Apenas super_admin; documentar em fluxo de permissões.

---

## 6. Estados vazios

- **Quando:** Lista sem itens, busca sem resultados, primeira vez em uma área.
- **Conteúdo sugerido:**
  - Ilustração ou ícone discreto (opcional).
  - Mensagem curta explicando por que está vazio.
  - Ação sugerida (ex.: "Conectar primeira conta", "Criar primeiro item") quando fizer sentido.
- **Tom:** Neutro e orientador; evitar culpa ("Você ainda não…") se preferir ("Ainda não há itens. Conecte uma conta para começar.").

---

## 7. Erros

- **Erro de página (ex.: 404, 500):**
  - Mensagem clara e amigável.
  - Ação sugerida (voltar, ir para início, tentar de novo).
- **Erro de formulário:**
  - Erro inline no campo e, se possível, resumo no topo.
  - Mensagem específica (não genérica "Erro ao salvar"); sugerir correção quando possível.
- **Erro de permissão (403):**
  - Mensagem explicando que o usuário não tem permissão.
  - Link para sair ou para área permitida.

---

## 8. Permissões

- **Comportamento:** Ocultar ou desabilitar ações que o usuário não pode executar; ao tentar acessar rota não permitida, exibir página ou mensagem de "Sem permissão" (403).
- **UI:** Não mostrar botões/links de ações proibidas quando for mais limpo; quando mostrar (ex.: para indicar que a função existe), desabilitar e opcionalmente tooltip "Sem permissão".
- **Consistência:** Verificação no servidor sempre; UI apenas para experiência (nunca confiar só no frontend).

---

## 9. Atualização

- Ao criar novas telas ou fluxos, verificar se se encaixam em um destes padrões ou se é necessário definir um novo; em caso de novo padrão, documentar aqui com a mesma estrutura (objetivo, estrutura, estados, exemplo no projeto).
