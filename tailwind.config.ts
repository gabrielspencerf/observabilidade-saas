import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Design System CL (cl-1design-system.html) — variáveis em globals.css */
        brand: {
          dark: "rgb(var(--color-brand-dark) / <alpha-value>)",
          surface: "rgb(var(--color-brand-surface) / <alpha-value>)",
          border: "rgb(var(--color-brand-border) / <alpha-value>)",
          neon: "rgb(var(--color-brand-neon) / <alpha-value>)",
          text: "rgb(var(--color-brand-text) / <alpha-value>)",
          muted: "rgb(var(--color-brand-muted) / <alpha-value>)",
        },
        primary: {
          500: "hsl(25, 95%, 53%)",
          600: "hsl(15, 95%, 50%)",
          700: "hsl(35, 95%, 60%)",
        },
        success: "hsl(142, 71%, 45%)",
        warning: "hsl(38, 92%, 50%)",
        error: "hsl(0, 84%, 60%)",
        info: "hsl(199, 89%, 48%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Bricolage Grotesque"', "Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        soft: "0px 0px 0px 1px rgba(0,0,0,0.06), 0px 1px 1px -0.5px rgba(0,0,0,0.06), 0px 3px 3px -1.5px rgba(0,0,0,0.06), 0px 6px 6px -3px rgba(0,0,0,0.06)",
        "soft-lg":
          "0px 0px 0px 1px rgba(0,0,0,0.06), 0px 1px 1px -0.5px rgba(0,0,0,0.06), 0px 3px 3px -1.5px rgba(0,0,0,0.06), 0px 6px 6px -3px rgba(0,0,0,0.06), 0px 12px 12px -6px rgba(0,0,0,0.06), 0px 24px 24px -12px rgba(0,0,0,0.06)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "grid-move": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(24px)" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out forwards",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "grid-move": "grid-move 20s linear infinite",
        "shimmer": "shimmer 3s ease-in-out infinite"
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
