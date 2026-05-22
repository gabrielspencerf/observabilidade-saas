"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui";
import { VysenAuraIcon } from "@/components/vysen-aura-icon";
import { QUICK_PROMPTS } from "@/components/vysen-dock/constants";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import { useVysenChat } from "@/features/vysen-chat/use-vysen-chat";

interface DashboardVysenChatDockProps {
  tenantId: string;
  children: React.ReactNode;
}

function extractContextFromTarget(target: EventTarget | null): string {
  if (!(target instanceof HTMLElement)) return "";
  const invalidTarget = target.closest("input, textarea, select, button, [contenteditable='true']");
  if (invalidTarget) return "";

  const selectionText = window.getSelection()?.toString()?.trim() ?? "";
  if (selectionText) return selectionText.replace(/\s+/g, " ").slice(0, 380);

  const sourceWithContext = target.closest("[data-vysen-context]");
  const dataContext = sourceWithContext?.getAttribute("data-vysen-context")?.trim() ?? "";
  if (dataContext) return dataContext.replace(/\s+/g, " ").slice(0, 380);

  const source = target.closest("td, th, p, h1, h2, h3, h4, h5, h6, span, li, a, div");
  const text = source?.textContent?.trim() ?? "";
  return text.replace(/\s+/g, " ").slice(0, 380);
}

function getContextActionSuggestions() {
  return [
    "Resumo executivo do dia em 5 bullets.",
    "Qual decisão devo tomar agora para gerar impacto?",
    "Transforme isso em plano de ação de 24h.",
  ];
}

export function DashboardVysenChatDock({ tenantId, children }: DashboardVysenChatDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; text: string } | null>(null);
  const [isThreadSelectorOpen, setIsThreadSelectorOpen] = useState(false);
  const {
    threads,
    activeThread,
    activeThreadId,
    experienceStarted,
    messages,
    loading,
    error,
    startExperience,
    setActiveThread,
    addContextToActiveThread,
    startNewConversation,
    sendMessage,
  } = useVysenChat({
    endpoint: "/api/dashboard/vysen/chat",
    tenantId,
    storageKey: "vysen-dashboard-chat",
  });

  const suggestionPrompts = useMemo(() => getContextActionSuggestions(), []);
  const composerPrompts = useMemo(
    () => (messages.length > 0 ? suggestionPrompts : QUICK_PROMPTS),
    [messages.length, suggestionPrompts]
  );

  useEffect(() => {
    const onGlobalClick = () => {
      setContextMenu(null);
      setIsThreadSelectorOpen(false);
    };
    document.addEventListener("click", onGlobalClick);
    return () => document.removeEventListener("click", onGlobalClick);
  }, []);

  useEffect(() => {
    const onGlobalContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      const extracted = extractContextFromTarget(event.target);
      const fallbackContext = document.title?.trim()
        ? `Contexto da tela: ${document.title.trim()}`
        : "Contexto da tela atual";
      const text = extracted || fallbackContext;
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        text: text.slice(0, 380),
      });
      setIsOpen(true);
      if (!experienceStarted) startExperience();
    };

    document.addEventListener("contextmenu", onGlobalContextMenu);
    return () => document.removeEventListener("contextmenu", onGlobalContextMenu);
  }, [experienceStarted, startExperience]);

  async function askExplainFromContext(text: string) {
    setIsOpen(true);
    if (!experienceStarted) startExperience();
    if (!activeThreadId) startNewConversation(text);
    addContextToActiveThread(text);
    await sendMessage(`Explique estes dados e o que significam no contexto da operação: "${text}"`);
    setContextMenu(null);
  }

  function applyAsCurrentContext(text: string) {
    setIsOpen(true);
    if (!experienceStarted) startExperience();
    if (!activeThreadId) startNewConversation(text);
    addContextToActiveThread(text);
    setContextMenu(null);
  }

  function applyAsNewConversation(text: string) {
    setIsOpen(true);
    if (!experienceStarted) startExperience();
    startNewConversation(text);
    setContextMenu(null);
  }

  return (
    <>
      <div
        className={`flex min-h-screen min-w-0 flex-1 transition-[padding] duration-200 ${isOpen ? "md:pr-[430px]" : ""}`}
      >
        <main className="min-h-screen min-w-0 flex-1 overflow-auto bg-brand-dark">
          {children}
        </main>
      </div>

      {isOpen && (
        <aside className="vysen-layer-dock fixed right-0 top-0 flex h-screen w-[min(100vw,460px)] flex-col overflow-visible border-l border-brand-border bg-brand-surface shadow-2xl">
          <div className="pointer-events-none absolute inset-x-[-10%] top-[-88px] z-0 h-[220px] rounded-[50%] bg-brand-neon/6 blur-3xl" />

          {experienceStarted && (
            <header className="relative z-10 border-b border-brand-border bg-brand-surface px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-surface/70 px-2.5 py-1 text-xs text-brand-muted">
                    <VysenAuraIcon className="h-3.5 w-3.5" />
                    Assistente Vysen
                  </div>
                  <p className="mt-2.5 text-base font-semibold text-brand-text">
                    Copiloto analítico da operação
                  </p>
                  <p className="mt-0.5 text-sm text-brand-muted">
                    Resumo, contexto salvo e próximo passo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-surface/80 text-brand-text transition hover:bg-brand-dark/25"
                >
                  <span className="sr-only">Fechar chat da Vysen</span>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-between rounded-2xl border border-brand-border bg-brand-surface/90 px-3.5 text-left text-sm text-brand-text transition hover:bg-brand-surface"
                    aria-haspopup="listbox"
                    aria-expanded={isThreadSelectorOpen}
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsThreadSelectorOpen((prev) => !prev);
                    }}
                  >
                    <span className="truncate">{activeThread?.title ?? "Selecionar conversa"}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-brand-muted transition ${isThreadSelectorOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isThreadSelectorOpen && (
                    <div
                      className="absolute left-0 top-[calc(100%+6px)] z-30 w-full overflow-hidden rounded-2xl border border-brand-border bg-brand-surface/96 p-1 shadow-2xl backdrop-blur-xl"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ul role="listbox" aria-label="Selecionar conversa" className="max-h-56 overflow-y-auto">
                        {threads.map((thread) => (
                          <li key={thread.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={thread.id === activeThreadId}
                              onClick={() => {
                                setActiveThread(thread.id);
                                setIsThreadSelectorOpen(false);
                              }}
                              className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition ${
                                thread.id === activeThreadId
                                  ? "bg-brand-neon/18 text-brand-text"
                                  : "text-brand-muted hover:bg-brand-dark/20 hover:text-brand-text"
                              }`}
                            >
                              <span className="truncate">{thread.title}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => startNewConversation()}
                  disabled={loading}
                  className="h-10 rounded-2xl border border-brand-border bg-brand-surface/56 px-3.5 text-sm text-brand-muted transition hover:bg-brand-surface/76 hover:text-brand-text disabled:opacity-60"
                >
                  Nova conversa
                </button>
              </div>
            </header>
          )}

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            {!experienceStarted ? (
              <div className="relative flex min-h-full items-center justify-center px-4 py-6 sm:py-8">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-border bg-brand-surface/80 text-brand-text transition hover:bg-brand-dark/25"
                >
                  <span className="sr-only">Fechar chat da Vysen</span>
                  <X className="h-4 w-4" />
                </button>
                <div className="w-full max-w-md rounded-[28px] border border-brand-border bg-brand-surface/76 px-6 py-8 text-center shadow-[0_16px_48px_rgba(0,0,0,0.18)]">
                  <div className="mb-4 flex justify-center">
                    <span className="vysen-chat-orb-shell inline-flex h-32 w-32 items-center justify-center rounded-full border border-brand-border bg-brand-dark/30 sm:h-40 sm:w-40">
                      <span className="vysen-chat-orb-ring" />
                      <span className="vysen-chat-orb-ring vysen-chat-orb-ring-secondary" />
                      <VysenAuraIcon className="relative z-[2] h-20 w-20 sm:h-24 sm:w-24" />
                    </span>
                  </div>
                  <p className="text-2xl font-semibold text-brand-text sm:text-3xl">Vysen</p>
                  <p className="mt-2 text-base text-brand-muted sm:text-lg">
                    Um chat mais claro para explorar dados, contexto e próximas ações.
                  </p>
                  <Button
                    type="button"
                    onClick={startExperience}
                    className="mt-6 h-11 rounded-xl px-5 text-sm sm:text-base"
                  >
                    Iniciar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <MessageList
                  messages={messages}
                  loading={loading}
                  error={error}
                  className="flex-1 px-4 pb-56 pt-4"
                  emptyState={
                    <div className="space-y-4">
                      <div className="rounded-[28px] border border-brand-border bg-brand-surface/72 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.14)]">
                        <div className="mb-4 flex items-center gap-3">
                          <span className="vysen-chat-orb-shell inline-flex h-14 w-14 items-center justify-center rounded-full border border-brand-border bg-brand-dark/30">
                            <span className="vysen-chat-orb-ring" />
                            <span className="vysen-chat-orb-ring vysen-chat-orb-ring-secondary" />
                            <VysenAuraIcon className="relative z-[2] h-9 w-9" />
                          </span>
                          <div>
                            <p className="text-lg font-semibold text-brand-text">Vysen</p>
                            <p className="mt-1 text-sm text-brand-muted">
                              Resumo, leitura de dados e próximas ações com menos ruído.
                            </p>
                          </div>
                        </div>
                        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-dark/20 px-2.5 py-1 text-xs text-brand-muted">
                          <Sparkles className="h-3 w-3 text-brand-neon" />
                          Contexto persistente
                        </div>
                        <p className="text-sm leading-6 text-brand-muted">
                          Clique com o botão direito em um dado para salvar contexto e continuar a análise.
                        </p>
                      </div>
                    </div>
                  }
                />

                {!loading && activeThread && activeThread.contexts.length > 0 && (
                  <div className="mx-4 mb-3 rounded-[24px] border border-brand-border bg-brand-surface/68 p-4">
                    <p className="mb-2 text-xs font-medium text-brand-muted">Contexto desta conversa</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeThread.contexts.slice(0, 5).map((context, index) => (
                        <span
                          key={`${context}-${index}`}
                          className="rounded-full border border-brand-border bg-brand-dark/20 px-2.5 py-1 text-xs text-brand-muted"
                          title={context}
                        >
                          {context.slice(0, 48)}
                          {context.length > 48 ? "..." : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Composer
                  loading={loading}
                  onSend={sendMessage}
                  quickPrompts={composerPrompts}
                  quickPromptMode="prefill"
                  placeholder="Peça um ajuste, um resumo ou a próxima ação"
                />
              </>
            )}
          </div>
        </aside>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="vysen-layer-fab fixed bottom-4 right-4 inline-flex h-14 items-center gap-3 rounded-full border border-brand-border bg-brand-surface/95 px-4 shadow-[0_14px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:-translate-y-[1px] hover:bg-brand-surface"
          aria-label="Abrir chat da Vysen"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-brand-border bg-brand-dark/20">
            <VysenAuraIcon className="h-4.5 w-4.5" />
          </span>
          <span className="pr-1 text-sm font-semibold tracking-wide text-brand-text">Vysen</span>
        </button>
      )}

      {contextMenu &&
        (() => {
          const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
          const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 720;
          const left = Math.min(contextMenu.x, viewportWidth - 286);
          const top = Math.min(contextMenu.y, viewportHeight - 180);
          return (
            <div
              className="vysen-layer-context fixed w-[270px] overflow-hidden rounded-xl border border-brand-border bg-brand-surface/96 shadow-2xl backdrop-blur-sm"
              style={{ left, top }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-brand-border bg-brand-surface/85 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">
                  Ações da Vysen
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] text-brand-text">{contextMenu.text}</p>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => void askExplainFromContext(contextMenu.text)}
                  className="mb-1.5 w-full rounded-lg px-3 py-2 text-left text-xs text-brand-text transition hover:bg-brand-surface"
                >
                  Explicar este dado
                </button>
                <button
                  type="button"
                  onClick={() => applyAsCurrentContext(contextMenu.text)}
                  className="mb-1.5 w-full rounded-lg px-3 py-2 text-left text-xs text-brand-text transition hover:bg-brand-surface"
                >
                  Usar como contexto da conversa atual
                </button>
                <button
                  type="button"
                  onClick={() => applyAsNewConversation(contextMenu.text)}
                  className="w-full rounded-lg px-3 py-2 text-left text-xs text-brand-text transition hover:bg-brand-surface"
                >
                  Iniciar nova conversa com este contexto
                </button>
              </div>
            </div>
          );
        })()}
    </>
  );
}
