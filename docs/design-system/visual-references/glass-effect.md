# Referência: Glass-effect

Padrões extraídos de `c:\Users\gabri\Desktop\Asimov\referencias\glass-effect\index.html` (Modern Glass Card). Reutilizar **exatamente** as classes e estruturas abaixo; não redesenhar.

---

## 1. Contexto

- **Fontes:** Plus Jakarta Sans (títulos, marca) e Inter (corpo); `font-jakarta`, `font-inter`.
- **Ícones:** Font Awesome (classes `fas fa-*`).
- **Framework:** Tailwind CSS com **theme extend** custom (primary, secondary, darkGray).
- **Efeito principal:** `.glass-effect` (backdrop-filter blur).

---

## 2. Tema Tailwind (extend)

Incluir no `tailwind.config` quando usar este padrão:

```js
colors: {
  primary: {
    500: 'hsl(25, 95%, 53%)',   // orange
    600: 'hsl(15, 95%, 50%)',   // darker orange
    700: 'hsl(35, 95%, 60%)',   // lighter orange
  },
  secondary: {
    800: 'hsl(45, 90%, 80%)',   // light orange/gold
  },
  darkGray: {
    50: 'hsl(25, 20%, 10%)',
    100: 'hsl(25, 15%, 15%)',
  }
},
fontFamily: {
  jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
  inter: ['Inter', 'sans-serif'],
}
```

---

## 3. Glass effect

- **Classe:** `.glass-effect` com:
  - `backdrop-filter: blur(12px);`
  - `-webkit-backdrop-filter: blur(12px);`
- **Uso típico:** Card sobre fundo colorido ou imagem: `glass-effect bg-gradient-to-r from-white/20 to-white/5`.
- **Bordas (overlay):** Duas camadas com mask para metade cada:
  - `border border-white/50 [mask-image:linear-gradient(135deg,white,transparent_50%)]`
  - `border border-primary-500/50 [mask-image:linear-gradient(135deg,transparent_50%,white)]`

---

## 4. Card “glass” (estrutura)

- **Card de fundo (laranja):** `card-bottom bg-gradient-to-br from-primary-700 via-primary-500 to-primary-600 shadow-lg`; posicionado atrás com `absolute -translate-x-1/2 -translate-y-1/2 top-8 left-0 glow`.
- **Dimensões (custom):** `.card-top { width: 31.65em; height: 18em; border-radius: 1em; }`, `.card-bottom { width: calc(31.65em * 0.8); height: 18em; border-radius: 1em; }`.
- **Glow:** `.glow { box-shadow: 0 0 15px rgba(255, 149, 0, 0.6); }`.

---

## 5. Conteúdo do card

- **Gradient no texto (título/estatísticas):** `.card-content-gradient` (background-image com gradientes e `background-clip: text`; `-webkit-background-clip: text`; `color: transparent`). Ou uso genérico: `.gradient-text { background-clip: text; -webkit-background-clip: text; color: transparent; }` com `bg-gradient-to-r from-white/90 to-white/70`.
- **Título:** `text-[24px] font-light leading-tight tracking-tight font-jakarta`; marca alinhada à direita: `text-[24px] font-semibold text-right font-jakarta`.
- **Divisor horizontal:** `.card-divider` — `height: 1px`; `background-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 80%, transparent)`.
- **Divisor vertical:** `.card-vertical-divider` — `width: 1px`; mesmo gradiente em 180deg.

---

## 6. Ícones em círculo

- **Classe:** `.icon-circle` — `height: 2rem; width: 2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2)`.
- **Ícone:** `text-xs` (Font Awesome).

---

## 7. Estatísticas (stats)

- **Valor:** `.stat-value` — `font-size: 1.4rem; font-weight: 600; line-height: 1.1`; pode usar `gradient-text bg-gradient-to-r from-white/90 to-white/70`.
- **Label:** `.stat-label` — `font-size: 0.7rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.05em`.
- **Layout:** `flex justify-between` com `.card-vertical-divider` entre itens.

---

## 8. Tags (feature tags)

- **Classe:** `text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/20`.
- **Exemplo:** `QUANTUM READY`, `AI OPTIMIZED`, etc.

---

## 9. CSS customizado completo (resumo)

```css
.glass-effect {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.gradient-text {
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
.card-divider {
  height: 1px;
  background-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 80%, transparent);
}
.card-vertical-divider {
  width: 1px;
  background-image: linear-gradient(180deg, transparent, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 80%, transparent);
}
.stat-value { font-size: 1.4rem; font-weight: 600; line-height: 1.1; }
.stat-label { font-size: 0.7rem; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.05em; }
.glow { box-shadow: 0 0 15px rgba(255, 149, 0, 0.6); }
.icon-circle {
  height: 2rem; width: 2rem; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
}
```

---

## 10. Quando usar / quando não usar

- **Usar:** Cards de destaque (hero, métricas, assinatura visual forte); fundos escuros ou coloridos onde o vidro (blur) cria hierarquia; marcas que queiram um look “premium” ou tech.
- **Não usar:** Listas longas (performance de blur); interfaces de alto contraste ou acessibilidade crítica sem fallback; evitar misturar Font Awesome e Lucide no mesmo componente sem padronizar em [foundations.md](../foundations.md).
