# Referência: Sidebar

Padrões extraídos de `c:\Users\gabri\Desktop\Asimov\referencias\sidebar\index.html` (ZincMail). Reutilizar **exatamente** as classes e estruturas abaixo; não redesenhar.

---

## 1. Contexto

- **Fonte:** Geist (`font-family: 'Geist', system-ui, sans-serif`).
- **Ícones:** Lucide (SVG com `class="lucide lucide-<name>"`, `data-lucide="<name>"`).
- **Framework:** Tailwind CSS.
- **Custom CSS:** `.sidebar`, `.scroll-hide`, `.beautiful-shadow` (ver seção 4).

---

## 2. Estrutura do sidebar

- **Container:** `<aside class="sidebar beautiful-shadow overflow-hidden bg-zinc-900 border-zinc-700 rounded-2xl">` (tema escuro) ou `bg-zinc-100 border-zinc-200` (tema claro).
- **Larguras:**
  - Default: `320px`.
  - `max-width: 768px`: `280px`.
  - `max-width: 640px`: `100%`, `max-width: 300px`.
- **Scroll:** `.scroll-hide` para esconder scrollbar quando o conteúdo rola.

---

## 3. Blocos principais

### 3.1 Cabeçalho da conta

- **Wrapper:** `flex items-center justify-between border-zinc-800 border-b pt-5 pr-5 pb-5 pl-5` (escuro) ou `border-zinc-200` (claro).
- **Botão conta:** `flex gap-2 beautiful-shadow hover:bg-zinc-800 transition-all text-sm font-medium bg-zinc-800 border-zinc-700 border rounded-xl pt-2.5 pr-4 pb-2.5 pl-4 items-center` (escuro). Claro: `bg-gradient-to-r from-zinc-50 to-white border-zinc-200`, `hover:shadow-md`.
- **Avatar:** `w-10 h-10 beautiful-shadow object-cover border-zinc-700 border-2 rounded-xl`; indicador online: `absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-zinc-900`.

### 3.2 Botão primário (CTA)

- **Escuro:** `w-full flex items-center justify-center gap-2 bg-gradient-to-r from-zinc-200 to-zinc-100 text-zinc-900 rounded-xl pt-3 pr-4 pb-3 pl-4 font-medium hover:from-zinc-100 hover:to-zinc-50 transition-all beautiful-shadow`.
- **Claro:** `bg-gradient-to-r from-zinc-800 to-zinc-900 text-zinc-100` e `hover:from-zinc-900 hover:to-zinc-800`.
- **Ícone:** `lucide lucide-edit w-4 h-4`.

### 3.3 Navegação

- **Nav:** `select-none text-sm pt-6 pr-2 pl-2`.
- **Item ativo (escuro):** `flex items-center gap-3 px-4 py-3 mx-2 bg-gradient-to-r from-zinc-700 to-zinc-800 text-zinc-100 rounded-xl beautiful-shadow`.
- **Item inativo (escuro):** `text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-xl transition-colors`.
- **Item ativo (claro):** `bg-gradient-to-r from-zinc-200 to-zinc-300 text-zinc-900 rounded-xl beautiful-shadow`.
- **Item inativo (claro):** `text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 rounded-xl transition-colors`.
- **Badge de contagem:** ativo `bg-zinc-600 text-zinc-200 text-xs px-2 py-1 rounded-full font-medium`; inativo `text-xs text-zinc-500` (ou `ml-auto` antes).
- **Ícones:** `w-5 h-5` no item.

### 3.4 Labels (seção colapsável)

- **Título:** `flex items-center gap-2 w-full text-zinc-500 uppercase text-xs tracking-wider font-medium mb-3`; chevron com `transition-transform`; plus `hover:bg-zinc-800 rounded p-0.5` (escuro) ou `hover:bg-zinc-200` (claro).
- **Item:** `flex items-center gap-3 w-full px-4 py-2.5 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 rounded-xl transition-colors`; dot `w-2 h-2 rounded-full bg-red-500` (ou blue, green, yellow); contagem `ml-auto text-xs text-zinc-500`.

### 3.5 Storage

- **Título:** `text-zinc-500 uppercase text-xs tracking-wider font-medium mb-3`.
- **Card:** `bg-zinc-800 rounded-lg p-4 border border-zinc-700` (escuro) ou `bg-zinc-50 border-zinc-200` (claro).
- **Barra:** `w-full bg-zinc-700 rounded-full h-2`; fill `bg-gradient-to-r from-zinc-400 to-zinc-300 h-2 rounded-full` (escuro) ou `bg-zinc-200` + fill `from-zinc-600 to-zinc-700` (claro).
- **Link:** `w-full mt-3 text-xs text-zinc-400 hover:text-zinc-300` (escuro) ou `text-zinc-600 hover:text-zinc-700` (claro).

### 3.6 Dropdown da conta

- **Container:** `mx-5 mt-2 rounded-xl bg-zinc-800 beautiful-shadow border border-zinc-700 p-5 text-sm`.
- **Item com check:** `flex items-center gap-3 w-full py-2.5 px-2 rounded-lg hover:bg-zinc-700`; ícone check `ml-auto text-emerald-400`.
- **Separador:** `hr class="my-4 border-zinc-700"`.
- **Ações:** Settings `text-zinc-300`; Sign Out `text-red-400`.

---

## 4. CSS customizado (incluir no projeto se usar este padrão)

```css
.sidebar { width: 320px; }
@media (max-width: 768px) { .sidebar { width: 280px; } }
@media (max-width: 640px) { .sidebar { width: 100%; max-width: 300px; } }
.scroll-hide::-webkit-scrollbar { display: none; }
.scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
.beautiful-shadow {
  box-shadow: 0px 0px 0px 1px rgba(0,0,0,0.06), 0px 1px 1px -0.5px rgba(0,0,0,0.06), 0px 3px 3px -1.5px rgba(0,0,0,0.06), 0px 6px 6px -3px rgba(0,0,0,0.06), 0px 12px 12px -6px rgba(0,0,0,0.06), 0px 24px 24px -12px rgba(0,0,0,0.06);
}
```

---

## 5. Resumo de cores (Tailwind)

| Uso | Escuro | Claro |
|-----|--------|--------|
| Fundo sidebar | `bg-zinc-900` | `bg-zinc-100` |
| Borda | `border-zinc-700` | `border-zinc-200` |
| Item ativo | `from-zinc-700 to-zinc-800`, `text-zinc-100` | `from-zinc-200 to-zinc-300`, `text-zinc-900` |
| Item inativo | `text-zinc-300` | `text-zinc-700` |
| Hover item | `hover:bg-zinc-800 hover:text-zinc-100` | `hover:bg-zinc-200 hover:text-zinc-900` |
| Badge ativo | `bg-zinc-600 text-zinc-200` | `bg-zinc-400 text-zinc-100` |
| Destaque (online, check) | `bg-emerald-400` | idem |

---

## 6. Quando usar / quando não usar

- **Usar:** Navegação principal da aplicação, múltiplas seções (inbox, starred, labels), indicador de conta e storage.
- **Não usar:** Como menu flutuante ou drawer único sem hierarquia de seções; evitar misturar com outro estilo de nav (ex.: top bar com estilo diferente) sem documentar a exceção.
