"use client";

import { useEffect, useRef } from "react";
import { Bot } from "lucide-react";
import type { ReactNode } from "react";
import type { VysenChatMessage } from "@/features/vysen-chat/model/types";

interface MessageListProps {
  messages: VysenChatMessage[];
  loading: boolean;
  error: string | null;
  emptyState?: ReactNode;
  className?: string;
}

function formatAssistantMessage(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[-*]{2,}/gm, "- ")
    .trim();
}

export function MessageList({
  messages,
  loading,
  error,
  emptyState,
  className = "",
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, loading]);

  return (
    <div ref={containerRef} className={`scroll-hide overflow-y-auto ${className}`}>
      {messages.length === 0 ? (
        emptyState ?? null
      ) : (
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" ? (
                <div className="max-w-[92%] rounded-[26px] border border-brand-border bg-brand-surface/74 px-4 py-3.5 shadow-[0_10px_28px_rgba(0,0,0,0.10)]">
                  <div className="mb-2 inline-flex items-center gap-2 text-xs text-brand-muted">
                    <Bot className="h-3.5 w-3.5" />
                    Vysen
                  </div>
                  <div className="whitespace-pre-wrap text-base leading-7 text-brand-text">
                    {formatAssistantMessage(message.text)}
                  </div>
                </div>
              ) : (
                <div className="max-w-[78%] rounded-[24px] border border-brand-neon/25 bg-brand-neon/10 px-4 py-3 text-base leading-7 text-brand-text shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
                  {message.text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="mt-4 max-w-[92%] rounded-[24px] border border-brand-border bg-brand-surface/74 px-4 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.10)]">
          <div className="inline-flex items-center gap-1 text-xs text-brand-text">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-neon" />
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-neon [animation-delay:120ms]" />
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-neon [animation-delay:240ms]" />
            <span className="ml-1">Vysen analisando</span>
          </div>
        </div>
      )}

      {error && (
        <p className="mx-1 mb-2 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
