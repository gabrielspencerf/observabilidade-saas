"use client";

import { AdminSidebar } from "@/components/admin-sidebar";
import { MobileSidebarDrawer } from "@/components/mobile-sidebar-drawer";
import type { SidebarInsightsPayload } from "@/types/sidebar-insights";

interface AdminMobileHeaderProps {
  userEmail: string;
  userName?: string | null;
  insights: SidebarInsightsPayload;
}

export function AdminMobileHeader({
  userEmail,
  userName,
  insights,
}: AdminMobileHeaderProps) {
  return (
    <MobileSidebarDrawer menuAriaLabel="Abrir menu de administração">
      <AdminSidebar userEmail={userEmail} userName={userName} insights={insights} />
    </MobileSidebarDrawer>
  );
}
