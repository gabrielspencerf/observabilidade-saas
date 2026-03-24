"use client";

/**
 * Sidebar do dashboard (usuário). Paleta CL: tema escuro, destaque verde.
 * Estrutura: cabeçalho conta, CTA Início, nav com ícones Lucide, rodapé (email + sair).
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardNotificationBell } from "@/components/dashboard-notification-bell";
import { SidebarNavSections } from "@/components/sidebar-nav-sections";
import { SidebarInsightsCarousel } from "@/components/sidebar-insights-carousel";
import { dashboardNavSections } from "@/components/sidebar-navigation";
import { Button } from "@/components/ui";
import type { SidebarInsightsPayload } from "@/types/sidebar-insights";

interface DashboardSidebarProps {
  userEmail: string;
  userName?: string | null;
  insights: SidebarInsightsPayload;
  hideNotificationBell?: boolean;
}

export function DashboardSidebar({
  userEmail,
  userName,
  insights,
  hideNotificationBell = false,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const userDisplayName = userName?.trim() || userEmail.split("@")[0] || "Usuário";
  const avatarLetter = userDisplayName.charAt(0).toUpperCase();
  const userFirstName = userDisplayName.split(" ")[0] || userDisplayName;

  return (
    <aside className="sidebar flex h-full min-h-0 min-w-0 flex-col overflow-x-visible border-r border-brand-border">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Topo: branding e boas-vindas (overflow visível para o dropdown do sininho) */}
        <div className="shrink-0 border-b border-brand-border p-4">
          <div className="flex items-start justify-between gap-2 px-2">
            <div className="min-w-0 flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-brand-muted">
                Dashboard
              </span>
              <h2 className="truncate text-lg font-semibold text-brand-text" title="Vysen">
                Vysen
              </h2>
              <p className="text-xs text-brand-muted">Bem-vindo, {userFirstName}</p>
            </div>
            {!hideNotificationBell && (
              <div className="shrink-0 self-start pt-0.5">
                <DashboardNotificationBell dropdownAlign="start" />
              </div>
            )}
          </div>
        </div>

        <div className="scroll-hide min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <SidebarNavSections
            pathname={pathname}
            sections={dashboardNavSections}
            enableAccordion
            bottomSlot={<SidebarInsightsCarousel insights={insights} />}
          />
        </div>

        {/* Rodapé: usuário + ações */}
        <div className="shrink-0 border-t border-brand-border p-4">
          <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-surface text-sm font-semibold text-brand-text shadow-sm">
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-brand-text" title={userDisplayName}>
                {userDisplayName}
              </p>
              <p className="truncate text-xs text-brand-muted" title={userEmail}>
                {userEmail}
              </p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 px-2">
            <Link
              href="/dashboard/support"
              className="fx-button inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-medium uppercase tracking-wider text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-text"
            >
              Suporte
            </Link>
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
