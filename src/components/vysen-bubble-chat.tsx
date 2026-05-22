"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Sparkles, X } from "lucide-react";
import { VysenAdminPanelContent } from "@/components/vysen-admin-panel-content";
import type { VysenAdminInsights } from "@/server/vysen/orchestrator";
import { VysenAuraIcon } from "@/components/vysen-aura-icon";

interface VysenBubbleChatProps {
  insights: VysenAdminInsights;
}

export function VysenBubbleChat({ insights }: VysenBubbleChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const alertsCount = insights.alerts.length;
  const failuresCount = insights.recentFailures.length;

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
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="vysen-layer-fab vysen-surface-floating fixed bottom-4 right-4 w-[min(92vw,320px)] rounded-2xl p-3 text-left transition hover:border-brand-neon/40 hover:bg-brand-surface"
          aria-label="Abrir resumo da Vysen"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand-border bg-brand-neon/10 text-brand-neon">
                <VysenAuraIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-brand-text">Vysen</p>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
                    resumo tecnico
                  </span>
                </div>
                <p className="mt-1 text-xs text-brand-muted">
                  {alertsCount > 0
                    ? `${alertsCount} alertas ativos para revisar`
                    : "Nenhum alerta prioritario agora"}
                </p>
              </div>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-brand-muted" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-brand-border/70 bg-brand-dark/50 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-brand-muted">Req 24h</p>
              <p className="mt-1 text-sm font-semibold text-brand-text">{insights.kpis.totalRequests24h}</p>
            </div>
            <div className="rounded-xl border border-brand-border/70 bg-brand-dark/50 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-brand-muted">Sucesso</p>
              <p className="mt-1 text-sm font-semibold text-brand-text">{insights.kpis.successRatePercent24h}%</p>
            </div>
            <div className="rounded-xl border border-brand-border/70 bg-brand-dark/50 px-2 py-2">
              <p className="text-[10px] uppercase tracking-wide text-brand-muted">Falhas</p>
              <p className="mt-1 text-sm font-semibold text-brand-text">{failuresCount}</p>
            </div>
          </div>
        </button>
      ) : null}

      {isOpen ? (
        <div className="vysen-layer-dock fixed inset-0">
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <section className="absolute bottom-4 right-4 top-20 flex w-[min(96vw,400px)] flex-col rounded-2xl border border-brand-border bg-brand-surface shadow-2xl">
            <header className="border-b border-brand-border px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <VysenAuraIcon className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-semibold text-brand-text">Vysen</p>
                    <p className="text-[11px] text-brand-muted">Copiloto tecnico do superadmin</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-brand-border p-1.5 text-brand-text"
                >
                  <span className="sr-only">Fechar Vysen</span>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-brand-border/70 bg-brand-dark/40 px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-brand-muted">Alertas</p>
                  <p className="mt-1 text-sm font-semibold text-brand-text">{alertsCount}</p>
                </div>
                <div className="rounded-xl border border-brand-border/70 bg-brand-dark/40 px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-brand-muted">Usuarios</p>
                  <p className="mt-1 text-sm font-semibold text-brand-text">{insights.kpis.uniqueUsers24h}</p>
                </div>
                <div className="rounded-xl border border-brand-border/70 bg-brand-dark/40 px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-brand-muted">Tokens</p>
                  <p className="mt-1 text-sm font-semibold text-brand-text">{insights.kpis.totalTokens24h}</p>
                </div>
              </div>
            </header>
            <div className="border-b border-brand-border/70 bg-brand-dark/30 px-4 py-2">
              <div className="flex items-center gap-2 text-[11px] text-brand-muted">
                <Sparkles className="h-3.5 w-3.5 text-brand-neon" />
                <span>Leitura rapida primeiro, detalhes tecnicos depois.</span>
              </div>
            </div>
            <div className="scroll-hide flex-1 overflow-y-auto p-4">
              <VysenAdminPanelContent insights={insights} />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
