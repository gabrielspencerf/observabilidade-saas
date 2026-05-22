"use client";

import { ChevronDown } from "lucide-react";
import type { RefObject } from "react";
import type { ChatThread } from "@/components/vysen-dock/types";

interface ThreadSelectorProps {
  threadRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  loading: boolean;
  threads: ChatThread[];
  activeThreadId: string | null;
  activeTitle: string;
  onToggle: () => void;
  onSelectThread: (threadId: string) => void;
  onNewConversation: () => void;
}

export function ThreadSelector({
  threadRef,
  isOpen,
  loading,
  threads,
  activeThreadId,
  activeTitle,
  onToggle,
  onSelectThread,
  onNewConversation,
}: ThreadSelectorProps) {
  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <div ref={threadRef} className="relative min-w-0">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-10 w-full items-center justify-between rounded-2xl border border-brand-border bg-brand-surface/90 px-3.5 text-sm text-brand-muted transition hover:bg-brand-surface hover:text-brand-text"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="truncate font-medium text-brand-text">{activeTitle}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="vysen-surface-dropdown absolute left-0 top-full z-30 mt-2 w-full min-w-[280px] overflow-hidden rounded-2xl">
            <div className="max-h-64 overflow-y-auto p-1.5">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => onSelectThread(thread.id)}
                  className={`mb-1 w-full overflow-hidden rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                    activeThreadId === thread.id
                      ? "border-brand-neon/35 bg-brand-neon/16 text-brand-text shadow-[0_10px_26px_rgba(0,0,0,0.10)]"
                      : "border-brand-border bg-brand-surface/92 text-brand-muted hover:bg-brand-surface hover:text-brand-text"
                  }`}
                >
                  <div className="grid gap-1 overflow-hidden">
                    <p className="line-clamp-1 font-semibold">{thread.title}</p>
                    <p className="line-clamp-1 text-[11px] text-brand-muted">{thread.summary || "Sem resumo ainda."}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onNewConversation}
        disabled={loading}
        className="h-10 rounded-2xl border border-brand-border bg-brand-surface/56 px-3.5 text-sm text-brand-muted transition hover:bg-brand-surface/76 hover:text-brand-text disabled:opacity-60"
      >
        Nova conversa
      </button>
    </div>
  );
}
