import type { VysenAdminInsights } from "@/server/vysen/orchestrator";
import { VysenAdminPanelContent } from "@/components/vysen-admin-panel-content";
import { VysenAuraIcon } from "@/components/vysen-aura-icon";

interface VysenAdminRightPanelProps {
  insights: VysenAdminInsights;
}

export function VysenAdminRightPanel({ insights }: VysenAdminRightPanelProps) {
  return (
    <aside className="h-full w-full border-l border-brand-border bg-brand-surface/30">
      <div className="sticky top-0 h-screen overflow-y-auto p-4">
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-brand-border bg-brand-surface px-3 py-2">
          <VysenAuraIcon className="h-4 w-4" />
          <div>
            <p className="text-sm font-semibold text-brand-text">Vysen</p>
            <p className="text-[11px] text-brand-muted">Capitã analista da operação</p>
          </div>
        </div>
        <VysenAdminPanelContent insights={insights} />
      </div>
    </aside>
  );
}

