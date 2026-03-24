"use client";

/**
 * Sidebar do admin.
 */

import { usePathname } from "next/navigation";
import { SidebarNavSections } from "@/components/sidebar-nav-sections";
import { SidebarInsightsCarousel } from "@/components/sidebar-insights-carousel";
import { adminNavSections } from "@/components/sidebar-navigation";
import { Button } from "@/components/ui";
import type { SidebarInsightsPayload } from "@/types/sidebar-insights";

interface AdminSidebarProps {
  userEmail: string;
  userName?: string | null;
  insights: SidebarInsightsPayload;
}

export function AdminSidebar({ userEmail, userName, insights }: AdminSidebarProps) {
  const pathname = usePathname();
  const displayName = userName?.trim() || userEmail.split("@")[0] || "Usuário";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <aside className="sidebar flex h-full flex-col scroll-hide overflow-y-auto overflow-x-hidden border-r border-brand-border">
      <div className="flex flex-1 flex-col">
        {/* Topo: branding e boas-vindas */}
        <div className="border-b border-brand-border p-4">
          <div className="flex flex-col gap-1 px-2">
            <div className="text-xs font-medium uppercase tracking-wider text-brand-muted">
              SUPERADMIN
            </div>
            <h2 className="truncate text-lg font-semibold text-brand-text">Vysen</h2>
            <p className="text-xs text-brand-muted">Bem-vindo Sr.</p>
          </div>
        </div>

        <SidebarNavSections
          pathname={pathname}
          sections={adminNavSections}
          bottomSlot={<SidebarInsightsCarousel insights={insights} />}
        />

        {/* Rodapé: usuário + ações */}
        <div className="mt-auto border-t border-brand-border p-4">
          <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-surface text-sm font-semibold text-brand-text shadow-sm">
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-brand-text" title={displayName}>
                {displayName}
              </p>
              <p className="truncate text-xs text-brand-muted" title={userEmail}>
                {userEmail}
              </p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 px-2">
            <form action="/api/auth/logout" method="POST">
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
