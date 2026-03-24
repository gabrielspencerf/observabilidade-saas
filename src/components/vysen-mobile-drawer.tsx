"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { VysenAdminPanelContent } from "@/components/vysen-admin-panel-content";
import type { VysenAdminInsights } from "@/server/vysen/orchestrator";
import { VysenAuraIcon } from "@/components/vysen-aura-icon";

interface VysenMobileDrawerProps {
  insights: VysenAdminInsights;
}

export function VysenMobileDrawer({ insights }: VysenMobileDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg p-2 text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-neon"
        aria-label="Abrir painel da Vysen"
      >
        <VysenAuraIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative ml-auto flex h-full w-[92%] max-w-md flex-col bg-brand-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
              <div className="flex items-center gap-2">
                <VysenAuraIcon className="h-4 w-4" />
                <p className="text-sm font-semibold text-brand-text">Vysen</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-brand-border p-1.5 text-brand-text"
              >
                <span className="sr-only">Fechar painel da Vysen</span>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="scroll-hide flex-1 overflow-y-auto p-4">
              <VysenAdminPanelContent insights={insights} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

