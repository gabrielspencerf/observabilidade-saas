"use client";

import { Check, ChevronDown } from "lucide-react";
import type { RefObject } from "react";
import { CONTEXT_AREAS } from "@/components/vysen-dock/constants";
import type { ContextArea } from "@/components/vysen-dock/types";

interface ContextSelectorProps {
  contextRef: RefObject<HTMLDivElement | null>;
  contextArea: ContextArea;
  isOpen: boolean;
  onToggle: () => void;
  onSelectArea: (area: ContextArea) => void;
}

export function ContextSelector({
  contextRef,
  contextArea,
  isOpen,
  onToggle,
  onSelectArea,
}: ContextSelectorProps) {
  return (
    <div ref={contextRef} className="relative shrink-0">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-10 w-[185px] items-center justify-between rounded-full border border-brand-border bg-brand-surface px-3.5 text-xs font-medium text-brand-text transition hover:bg-brand-surface focus:border-brand-neon/35 focus:outline-none"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{CONTEXT_AREAS.find((a) => a.id === contextArea)?.label ?? "Geral"}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-brand-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div role="listbox" className="vysen-surface-dropdown absolute bottom-full z-50 mb-2 w-[220px] overflow-hidden rounded-2xl">
          <div className="max-h-56 overflow-y-auto py-1">
            {CONTEXT_AREAS.map((area) => {
              const active = contextArea === area.id;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => onSelectArea(area.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12px] transition ${
                    active
                      ? "bg-brand-neon/16 text-brand-text"
                      : "text-brand-muted hover:bg-brand-surface/92 hover:text-brand-text"
                  }`}
                >
                  <span>{area.label}</span>
                  {active && <Check className="h-3.5 w-3.5 text-brand-neon" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
