"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AdminSidebar } from "@/components/admin-sidebar";

interface AdminMobileHeaderProps {
  userEmail: string;
}

export function AdminMobileHeader({ userEmail }: AdminMobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <header className="border-b border-brand-border bg-brand-surface px-4 py-3 md:hidden flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-brand-text">Administração</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="text-brand-muted hover:text-brand-text p-1"
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex w-[280px] max-w-[80%] flex-col bg-brand-surface shadow-xl">
            <div className="absolute right-0 top-0 -mr-12 pt-4">
              <button
                type="button"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-brand-surface/20 text-white focus:outline-none focus:ring-2 focus:ring-brand-neon"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Fechar barra lateral</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="h-full w-full">
              <AdminSidebar userEmail={userEmail} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
