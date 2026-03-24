import type { LucideIcon } from "lucide-react";

interface DashboardPageHeaderProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  badges?: string[];
  actions?: React.ReactNode;
  className?: string;
}

export function DashboardPageHeader({
  title,
  description,
  icon: Icon,
  badges = [],
  actions,
  className = "",
}: DashboardPageHeaderProps) {
  return (
    <div className={`mb-6 flex flex-wrap items-start justify-between gap-4 ${className}`}>
      <div>
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-brand-border/60 p-1.5">
            <Icon className="h-4 w-4 text-brand-text" />
          </div>
          <h1 className="text-2xl font-bold text-brand-text">{title}</h1>
        </div>
        {description ? <p className="mt-2 text-sm text-brand-muted">{description}</p> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {badges.map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-brand-border px-2.5 py-1 text-xs text-brand-muted"
          >
            {badge}
          </span>
        ))}
        {actions}
      </div>
    </div>
  );
}
