"use client";

import { AdminSidebar } from "@/components/admin-sidebar";
import { MobileSidebarDrawer } from "@/components/mobile-sidebar-drawer";
import type { SidebarInsightsPayload } from "@/types/sidebar-insights";

interface AdminMobileHeaderProps {
  userEmail: string;
  userName?: string | null;
  insights: SidebarInsightsPayload;
  variant?: "admin" | "superadmin";
}

export function AdminMobileHeader({
  userEmail,
  userName,
  insights,
  variant = "superadmin",
}: AdminMobileHeaderProps) {
  return (
    <MobileSidebarDrawer
      menuAriaLabel={variant === "admin" ? "Abrir menu da empresa" : "Abrir menu de superadmin"}
    >
      <AdminSidebar
        userEmail={userEmail}
        userName={userName}
        insights={insights}
        variant={variant}
      />
    </MobileSidebarDrawer>
  );
}
