"use client";

import { useEffect, useState } from "react";
import { Sun } from "lucide-react";

const STORAGE_KEY = "ds-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as "dark" | "light" | null;
      const isDark = stored !== "light";
      setTheme(isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } catch {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.classList.toggle("light", next === "light");
      document.documentElement.setAttribute('data-theme', next);
      try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }

  if (!mounted) {
    return (
      <button className="text-brand-muted hover:text-brand-text transition-colors p-2" aria-label="Carregando tema">
        <Sun className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-brand-muted hover:text-brand-text transition-colors p-2"
      aria-label="Alternar tema"
    >
      <Sun className="h-5 w-5" />
    </button>
  );
}
