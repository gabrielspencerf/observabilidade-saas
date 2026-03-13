/**
 * Linha de estatísticas (KPIs) no topo da seção.
 * Base: dashboard-list — flex gap-14, cada stat: flex flex-col items-center; valor + ícone; label uppercase tracking-wide; separador w-px bg-neutral-200.
 */

import type { LucideIcon } from "lucide-react";

export type StatItem = {
  value: string;
  label: string;
  icon?: LucideIcon;
  iconClassName?: string;
};

export function StatsRow({
  items,
  className = "",
}: {
  items: StatItem[];
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-start gap-6 sm:gap-14 ${className}`}
      role="list"
    >
      {items.flatMap((item, i) => [
        <div key={`stat-${i}`} className="flex flex-col items-center" role="listitem">
          <div className="mb-1 flex items-center gap-2">
            {item.icon && (
              <item.icon
                className={`h-4 w-4 shrink-0 ${item.iconClassName ?? "text-brand-neon"}`}
                aria-hidden
              />
            )}
            <span className="text-2xl font-semibold text-brand-text sm:text-3xl">
              {item.value}
            </span>
          </div>
          <span className="text-center text-xs uppercase tracking-wide text-brand-muted">
            {item.label}
          </span>
        </div>,
        ...(i < items.length - 1
          ? [
              <div
                key={`sep-${i}`}
                className="hidden h-12 w-px shrink-0 bg-brand-border sm:block"
                aria-hidden
              />,
            ]
          : []),
      ])}
    </div>
  );
}
