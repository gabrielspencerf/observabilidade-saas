/**
 * Shell da área admin (super_admin): navegação dedicada usando Sidebar.
 */

import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminMobileHeader } from "@/components/admin-mobile-header";
import { DashboardPageLayout } from "@/components/layout";
import { VysenBubbleChat } from "@/components/vysen-bubble-chat";
import type { SidebarInsightsPayload } from "@/types/sidebar-insights";
import { getVysenAdminInsights } from "@/server/vysen/orchestrator";

interface AdminShellProps {
  userEmail: string;
  userName?: string | null;
  insights: SidebarInsightsPayload;
  children: React.ReactNode;
}

export async function AdminShell({ userEmail, userName, insights, children }: AdminShellProps) {
  const vysenInsights = await getVysenAdminInsights(30);

  return (
    <div className="flex min-h-screen flex-col bg-brand-dark md:flex-row">
      {/* Sidebar: desktop */}
      <div className="fixed left-0 top-0 z-30 hidden h-screen w-[248px] md:block">
        <AdminSidebar userEmail={userEmail} userName={userName} insights={insights} />
      </div>
      {/* Espaço para não sobrepor o conteúdo ao sidebar */}
      <div className="hidden w-[248px] shrink-0 md:block" aria-hidden />
      
      {/* Mobile: barra superior com drawer */}
      <AdminMobileHeader
        userEmail={userEmail}
        userName={userName}
        insights={insights}
      />

      <main className="min-w-0 flex-1 overflow-auto pt-16 md:pt-0">
        <DashboardPageLayout>{children}</DashboardPageLayout>
      </main>

      <VysenBubbleChat insights={vysenInsights} />
    </div>
  );
}
