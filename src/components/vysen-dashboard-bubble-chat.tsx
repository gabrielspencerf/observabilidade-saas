"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { VysenCopilotChat } from "@/components/vysen-copilot-chat";
import { VysenAuraIcon } from "@/components/vysen-aura-icon";

interface VysenDashboardBubbleChatProps {
  tenantId: string;
}

export function VysenDashboardBubbleChat({ tenantId }: VysenDashboardBubbleChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onGlobalContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      setIsOpen(true);
    };

    document.addEventListener("contextmenu", onGlobalContextMenu);
    return () => document.removeEventListener("contextmenu", onGlobalContextMenu);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="vysen-layer-fab vysen-surface-floating fixed bottom-4 right-4 inline-flex h-12 items-center gap-2 rounded-full px-3 text-brand-neon transition hover:-translate-y-[1px] hover:bg-brand-surface"
        aria-label="Abrir chat da Vysen"
      >
        <VysenAuraIcon className="h-5 w-5" />
        <span className="pr-0.5 text-xs font-semibold tracking-wide text-brand-text">Vysen</span>
      </button>

      {isOpen && (
        <div className="vysen-layer-dock fixed inset-0">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <section className="absolute bottom-4 right-4 top-4 flex w-[min(96vw,430px)] flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-2xl">
            <header className="flex items-center justify-between border-b border-brand-border/80 bg-brand-surface px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand-border bg-brand-surface/80">
                  <VysenAuraIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-brand-text">Vysen</p>
                  <p className="text-[11px] text-brand-muted">Analista da sua operação</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-brand-border bg-brand-surface/70 p-1.5 text-brand-text transition hover:bg-brand-surface"
              >
                <span className="sr-only">Fechar chat da Vysen</span>
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1">
              <VysenCopilotChat
                tenantId={tenantId}
                endpoint="/api/dashboard/vysen/chat"
                title="Copiloto Vysen"
                description="Converse sobre funil, campanhas, negociação e próximos passos."
              />
            </div>
          </section>
        </div>
      )}
    </>
  );
}

