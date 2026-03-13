# Referência: Dashboard-list

Padrões extraídos de `c:\Users\gabri\Desktop\Asimov\referencias\dashboard-list\index.html` (Advanced Learning Dashboard). Reutilizar **exatamente** as classes e estruturas abaixo; não redesenhar.

---

## 1. Contexto

- **Fonte:** Inter (`font-family: 'Inter', system-ui, sans-serif`).
- **Ícones:** Lucide (SVG com `class="lucide lucide-<name>"`, `data-lucide="<name>"`).
- **Framework:** Tailwind CSS.
- **Background página:** `bg-[#E8F4F8]` (ou fallback `bg-gray-500`), padding `pt-8 pr-8 pb-8 pl-8`.
- **Container:** `w-full max-w-[1200px] space-y-10`.

---

## 2. Seção principal (card branco)

- **Wrapper:** `bg-white rounded-3xl shadow px-10 pt-10 pb-6`.
- **Cabeçalho:** `flex flex-wrap items-start justify-between mb-8`.
  - Título: `text-2xl font-semibold text-neutral-900 mb-2`.
  - Descrição: `text-sm text-neutral-600 max-w-md`.

---

## 3. Stats (métricas no topo)

- **Container:** `flex gap-14 mt-6 sm:mt-0` (alinhado ao cabeçalho).
- **Cada stat:** `flex flex-col items-center`.
  - Valor + ícone: `flex items-center gap-2 mb-1`; número `text-3xl font-semibold`; ícone `w-4 h-4 text-cyan-600` (ou `text-emerald-600`, `text-amber-500`).
  - Label: `text-xs uppercase tracking-wide text-neutral-500 text-center` (pode quebrar em duas linhas).
- **Separador:** `w-px bg-neutral-200` entre stats.

---

## 4. Listagem com cabeçalho de colunas

- **Header da tabela:** `flex items-center justify-between rounded-full bg-neutral-50 px-6 py-2 mb-4 text-xs font-medium text-neutral-600 uppercase tracking-wide`.
  - Colunas com largura fixa: `w-[220px]`, `w-[160px]`, `w-[120px]`, `w-[100px]`, `w-[110px]`, `w-[80px]`, `w-[40px]`.
- **Container das linhas:** `space-y-3`.

---

## 5. Linha da listagem (card por linha)

- **Wrapper:** `flex items-center justify-between rounded-2xl ... px-6 py-4 hover:shadow-md transition-shadow`.
- **Gradientes de fundo por tema (exemplos):**
  - Violeta: `bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100`.
  - Teal: `from-teal-50 to-cyan-50 border border-teal-100`.
  - Amber: `from-amber-50 to-orange-50 border border-amber-100`.
  - Indigo: `from-indigo-50 to-blue-50 border border-indigo-100`.
- **Coluna Expert & Role (exemplo):**
  - Container: `flex items-center gap-4 w-[220px]`.
  - Avatar: `w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm`; status `absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white` (ou `bg-amber-400`).
  - Nome: `font-semibold text-sm`.
  - Subtítulo: `text-xs text-neutral-600`.
  - Meta: `flex items-center gap-1 mt-1`; ícone `w-3 h-3 text-violet-500` (ou teal, amber, indigo); texto `text-xs text-neutral-500`.
- **Outras colunas:** `text-sm font-medium` principal; `text-xs text-neutral-500` secundário.
- **Dificuldade:** `flex items-center gap-2`; dot `w-2 h-2 rounded-full bg-emerald-400` (Beginner), `bg-rose-500` (Expert), `bg-amber-500` (Intermediate); texto `text-xs font-medium`.
- **Badge “vagas”:** `px-2 py-1 ... text-xs font-medium rounded-full` — escasso `bg-rose-100 text-rose-700`, disponível `bg-emerald-100 text-emerald-700`.
- **Botão ação:** `p-2 hover:bg-white/50 rounded-full transition-colors`; ícone `w-4 h-4 text-violet-600` (ou cor do tema da linha).

---

## 6. Rodapé da seção (ações)

- **Container:** `mt-6 flex items-center justify-between`.
- **Link secundário:** `flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors`.
- **CTA primário:** `flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-full text-sm font-medium hover:from-cyan-700 hover:to-teal-700 transition-all`.

---

## 7. Cards auxiliares (grid 2 colunas)

- **Grid:** `grid lg:grid-cols-2 gap-8`.
- **Card com imagem de fundo:** `overflow-hidden relative flex items-center bg-[url(...)] bg-cover rounded-3xl pt-8 pr-8 pb-8 pl-8`; conteúdo em `relative z-10 max-w-[280px] text-white`.
- **Card “Learning Analytics”:** fundo com imagem; título `text-xl font-bold text-white`; subtítulo `text-sm text-emerald-100`; toggle Week/Month: `inline-flex bg-white/20 rounded-full p-1 text-xs`; botão ativo `px-4 py-2 rounded-full bg-white text-emerald-700 font-medium`; inativo `text-white hover:text-emerald-100`. Stats em `grid grid-cols-3 gap-4`: valor `text-2xl font-bold text-white`, label `text-xs text-emerald-100`. Barras: `h-32 w-6 bg-white/20 rounded-full overflow-hidden flex flex-col justify-end`; fill `bg-white rounded-full` com altura em %.

---

## 8. Resumo de cores e tokens

| Uso | Classe |
|-----|--------|
| Fundo página | `bg-[#E8F4F8]` |
| Card | `bg-white`, `rounded-3xl`, `shadow` |
| Título seção | `text-2xl font-semibold text-neutral-900` |
| Texto secundário | `text-neutral-600`, `text-neutral-500` |
| Stats (ícones) | `text-cyan-600`, `text-emerald-600`, `text-amber-500` |
| Linhas (temas) | violet/teal/amber/indigo 50 + border 100 |
| Badge escasso | `bg-rose-100 text-rose-700` |
| Badge disponível | `bg-emerald-100 text-emerald-700` |
| CTA | `from-cyan-600 to-teal-600`, `hover:from-cyan-700 hover:to-teal-700` |

---

## 9. Quando usar / quando não usar

- **Usar:** Dashboards com listagem de itens (sessões, leads, projetos), métricas no topo, filtros por coluna e ações por linha; cards promocionais ou de analytics ao lado.
- **Não usar:** Listas simples sem necessidade de múltiplas colunas ou estados visuais (vagas, dificuldade); evitar misturar muitos temas de cor (violet/teal/amber/indigo) na mesma lista sem critério semântico.
