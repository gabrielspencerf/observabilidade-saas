"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { VysenCopilotChat } from "@/components/vysen-copilot-chat";
import { VysenAuraIcon } from "@/components/vysen-aura-icon";

interface VysenDashboardBubbleChatProps {
  tenantId: string;
}

export function VysenDashboardBubbleChat({ tenantId }: VysenDashboardBubbleChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-brand-border bg-brand-surface text-brand-neon shadow-lg transition hover:scale-[1.03] hover:bg-brand-surface/90"
        aria-label="Abrir chat da Vysen"
      >
        <VysenAuraIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <section className="absolute bottom-4 right-4 top-4 flex w-[min(96vw,420px)] flex-col rounded-2xl border border-brand-border bg-brand-surface shadow-2xl">
            <header className="flex items-center justify-between border-b border-brand-border px-4 py-3">
              <div className="flex items-center gap-2">
                <VysenAuraIcon className="h-4 w-4" />
                <div>
                  <p className="text-sm font-semibold text-brand-text">Vysen</p>
                  <p className="text-[11px] text-brand-muted">Analista da sua operação</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-brand-border p-1.5 text-brand-text"
              >
                <span className="sr-only">Fechar chat da Vysen</span>
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="scroll-hide flex-1 overflow-y-auto p-4">
              <VysenCopilotChat
                tenantId={tenantId}
                endpoint="/api/dashboard/vysen/chat"
                title="Chat analítico da Vysen"
                description="Converse com a Vysen sobre funil, campanhas, negociação e próximos passos."
              />
            </div>
          </section>
        </div>
      )}
    </>
  );
}

