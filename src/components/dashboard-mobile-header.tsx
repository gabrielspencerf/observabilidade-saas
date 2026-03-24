"use client";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { MobileSidebarDrawer } from "@/components/mobile-sidebar-drawer";
import { DashboardNotificationBell } from "@/components/dashboard-notification-bell";
import type { SidebarInsightsPayload } from "@/types/sidebar-insights";

interface DashboardMobileHeaderProps {
  userEmail: string;
  userName?: string | null;
  insights: SidebarInsightsPayload;
}

export function DashboardMobileHeader({ userEmail, userName, insights }: DashboardMobileHeaderProps) {
  return (
    <MobileSidebarDrawer
      menuAriaLabel="Abrir menu do dashboard"
      rightSlot={<DashboardNotificationBell />}
    >
      <DashboardSidebar
        userEmail={userEmail}
        userName={userName}
        insights={insights}
        hideNotificationBell
      />
    </MobileSidebarDrawer>
  );
}
