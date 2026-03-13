import { FileX2 } from "lucide-react";
import React from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-border border-dashed bg-brand-surface/30 px-6 py-12 text-center animate-fade-in">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-surface border border-brand-border text-brand-muted">
        {icon || <FileX2 className="h-6 w-6" />}
      </div>
      <h3 className="mb-1 text-sm font-medium text-brand-text">{title}</h3>
      <p className="mb-6 text-sm text-brand-muted max-w-sm">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}