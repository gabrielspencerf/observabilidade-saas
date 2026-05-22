/**
 * Shell compartilhada entre superadmin tecnico e admin da empresa.
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
  variant?: "admin" | "superadmin";
  showVysen?: boolean;
}

export async function AdminShell({
  userEmail,
  userName,
  insights,
  children,
  variant = "superadmin",
  showVysen = variant === "superadmin",
}: AdminShellProps) {
  const vysenInsights = showVysen ? await getVysenAdminInsights(30) : null;

  return (
    <div className="flex min-h-screen flex-col bg-brand-dark md:flex-row">
      <div className="vysen-layer-sidebar fixed left-0 top-0 hidden h-screen w-[248px] md:block">
        <AdminSidebar
          userEmail={userEmail}
          userName={userName}
          insights={insights}
          variant={variant}
        />
      </div>
      <div className="hidden w-[248px] shrink-0 md:block" aria-hidden />

      <AdminMobileHeader
        userEmail={userEmail}
        userName={userName}
        insights={insights}
        variant={variant}
      />

      <main className="min-w-0 flex-1 overflow-auto pt-16 md:pt-0">
        <DashboardPageLayout>{children}</DashboardPageLayout>
      </main>

      {showVysen && vysenInsights ? <VysenBubbleChat insights={vysenInsights} /> : null}
    </div>
  );
}
