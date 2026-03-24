"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, SendHorizonal, X } from "lucide-react";
import { Button } from "@/components/ui";
import { VysenAuraIcon } from "@/components/vysen-aura-icon";

interface DashboardVysenChatDockProps {
  tenantId: string;
  children: React.ReactNode;
}

type ChatRole = "user" | "assistant";
interface ChatMessage {
  role: ChatRole;
  text: string;
}

type ContextArea =
  | "geral"
  | "conversas"
  | "leads"
  | "oportunidades"
  | "ads"
  | "funil"
  | "operacao";

const CONTEXT_AREAS: Array<{ id: ContextArea; label: string }> = [
  { id: "geral", label: "Geral" },
  { id: "conversas", label: "Conversas" },
  { id: "leads", label: "Leads" },
  { id: "oportunidades", label: "Oportunidades" },
  { id: "ads", label: "Ads" },
  { id: "funil", label: "Funil" },
  { id: "operacao", label: "Operação" },
];

function toApiHistory(messages: ChatMessage[]) {
  return messages.slice(-12).map((m) => ({
    role: m.role,
    content: m.text,
  }));
}

export function DashboardVysenChatDock({ tenantId, children }: DashboardVysenChatDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [contextArea, setContextArea] = useState<ContextArea>("geral");
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const contextRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const nextHistory = [...messages, { role: "user" as const, text }];
    setMessages(nextHistory);
    setInput("");
    if (composerRef.current) {
      composerRef.current.style.height = "54px";
    }
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard/vysen/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          tenantId,
          contextArea,
          history: toApiHistory(nextHistory),
        }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok || !data.answer) {
        setError(data.error ?? "Falha ao consultar a Vysen.");
        return;
      }
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer ?? "" }]);
    } catch {
      setError("Falha de conexão ao consultar a Vysen.");
    } finally {
      setLoading(false);
    }
  }

  function autoResizeComposer(value: string) {
    const element = composerRef.current;
    if (!element) return;
    element.style.height = "54px";
    if (value.trim().length === 0) {
      return;
    }
    const nextHeight = Math.min(element.scrollHeight, 200);
    element.style.height = `${nextHeight}px`;
  }

  function startNewConversation() {
    if (loading) return;
    setMessages([]);
    setInput("");
    setError(null);
    setContextArea("geral");
    if (composerRef.current) {
      composerRef.current.style.height = "54px";
      composerRef.current.focus();
    }
  }

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!isContextOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!contextRef.current) return;
      if (contextRef.current.contains(event.target as Node)) return;
      setIsContextOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isContextOpen]);

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      <div
        className={`flex min-h-screen min-w-0 flex-1 transition-[padding] duration-200 ${isOpen ? "md:pr-[420px]" : ""}`}
      >
        <main className="min-h-screen min-w-0 flex-1 overflow-auto bg-brand-dark">
          {children}
        </main>
      </div>

      {isOpen && (
        <aside className="fixed right-0 top-0 z-50 flex h-screen w-[min(96vw,420px)] flex-col border-l border-brand-border bg-brand-surface/95 shadow-2xl backdrop-blur-sm">
          <header className="flex items-center justify-between border-b border-brand-border px-4 py-3">
            <div className="flex items-center gap-2">
              <VysenAuraIcon className="h-4 w-4" />
              <div>
                <p className="text-sm font-semibold text-brand-text">Vysen</p>
                <p className="text-[11px] text-brand-muted">Chat analítico da operação</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startNewConversation}
                disabled={loading}
                className="rounded-full border border-brand-border px-2 py-1 text-[10px] text-brand-muted transition hover:text-brand-text disabled:opacity-60"
              >
                Nova conversa
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-brand-border p-1.5 text-brand-text"
              >
                <span className="sr-only">Fechar chat da Vysen</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div ref={messagesContainerRef} className="scroll-hide flex-1 space-y-2 overflow-y-auto px-3 py-3">
            {messages.length === 0 ? (
              <div className="rounded-lg border border-brand-border bg-brand-surface/60 p-3 text-xs text-brand-muted">
                Pergunte sobre funil, negociações, campanhas, gargalos e próximos passos.
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={`${m.role}-${idx}`}
                  className={`rounded-lg border px-3 py-2 text-xs whitespace-pre-wrap ${
                    m.role === "user"
                      ? "border-brand-neon/30 bg-brand-neon/10 text-brand-text"
                      : "border-brand-border bg-brand-surface/70 text-brand-muted"
                  }`}
                >
                  {m.text}
                </div>
              ))
            )}
            {loading && (
              <div className="inline-flex items-center gap-1 rounded-lg border border-brand-border bg-brand-surface/70 px-3 py-2 text-[11px] text-brand-muted">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-muted" />
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-muted [animation-delay:120ms]" />
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-muted [animation-delay:240ms]" />
                <span className="ml-1">Vysen analisando...</span>
              </div>
            )}
          </div>

          {error && (
            <p className="mx-3 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">
              {error}
            </p>
          )}

          <footer className="mt-auto border-t border-brand-border bg-brand-surface/98 p-3">
            <div className="rounded-2xl border border-brand-border bg-brand-surface/80 transition focus-within:border-brand-neon/60 focus-within:ring-2 focus-within:ring-brand-neon/20">
              <div className="px-3 pt-2.5">
                <textarea
                  ref={composerRef}
                  rows={2}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    autoResizeComposer(e.target.value);
                  }}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Pergunte para a Vysen..."
                  className="min-h-[54px] w-full flex-1 resize-none bg-transparent text-xs text-brand-text outline-none placeholder:text-brand-muted"
                />
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-brand-border/70 px-2.5 py-2">
                <div ref={contextRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsContextOpen((prev) => !prev)}
                    className="inline-flex h-8 w-[170px] items-center justify-between rounded-lg border border-brand-border bg-brand-surface/70 px-2.5 text-[11px] font-medium text-brand-text transition hover:bg-brand-surface/90 focus:outline-none focus:border-brand-neon/60 focus:ring-2 focus:ring-brand-neon/20"
                    aria-haspopup="listbox"
                    aria-expanded={isContextOpen}
                  >
                    <span>{CONTEXT_AREAS.find((a) => a.id === contextArea)?.label ?? "Geral"}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-brand-muted transition-transform ${
                        isContextOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isContextOpen && (
                    <div
                      role="listbox"
                      className="absolute bottom-full mb-2 w-[220px] overflow-hidden rounded-xl border border-brand-border bg-brand-surface shadow-xl"
                    >
                      <div className="max-h-56 overflow-y-auto py-1">
                        {CONTEXT_AREAS.map((area) => {
                          const active = contextArea === area.id;
                          return (
                            <button
                              key={area.id}
                              type="button"
                              onClick={() => {
                                setContextArea(area.id);
                                setIsContextOpen(false);
                              }}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12px] transition ${
                                active
                                  ? "bg-brand-neon/15 text-brand-text"
                                  : "text-brand-muted hover:bg-brand-surface/90 hover:text-brand-text"
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
                <Button
                  type="button"
                  onClick={sendMessage}
                  disabled={!canSend}
                  size="sm"
                  className="h-8 min-w-8 rounded-full px-2.5"
                >
                  <SendHorizonal className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </footer>
        </aside>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-brand-border bg-brand-surface text-brand-neon shadow-lg transition hover:scale-[1.03] hover:bg-brand-surface/90"
          aria-label="Abrir chat da Vysen"
        >
          <VysenAuraIcon className="h-5 w-5" />
        </button>
      )}
    </>
  );
}

