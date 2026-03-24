"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

interface MobileSidebarDrawerProps {
  menuAriaLabel: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function MobileSidebarDrawer({
  menuAriaLabel,
  rightSlot,
  children,
}: MobileSidebarDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/*
        Sem barra horizontal full-width: controles flutuantes (&lt; md).
        Em telas maiores o shell usa sidebar fixa.
      */}
      <div
        className="pointer-events-none fixed right-3 z-40 flex max-w-[calc(100vw-1.5rem)] justify-end md:hidden"
        style={{ top: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-brand-border bg-brand-surface/95 px-1 py-1 shadow-lg backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-lg p-2 text-brand-muted transition-colors hover:bg-brand-surface hover:text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-neon"
            aria-label={menuAriaLabel}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          {rightSlot}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex w-[280px] max-w-[84%] flex-col bg-brand-surface shadow-xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-brand-surface/95 text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-neon"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Fechar barra lateral</span>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="h-full w-full pt-8">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
