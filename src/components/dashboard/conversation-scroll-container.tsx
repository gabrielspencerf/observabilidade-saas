"use client";

import { useEffect, useRef } from "react";

/**
 * Área de rolagem do histórico: mantém o foco no fim da conversa (últimas mensagens).
 */
export function ConversationScrollContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, []);

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col overflow-y-auto ${className}`}>
      {children}
      <div ref={bottomRef} className="h-px w-full shrink-0 scroll-mt-4" aria-hidden />
    </div>
  );
}
