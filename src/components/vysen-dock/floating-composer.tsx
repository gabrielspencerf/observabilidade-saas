"use client";

import { Mic, MicOff, SendHorizontal } from "lucide-react";
import type { KeyboardEvent, RefObject } from "react";
import { Button } from "@/components/ui";
import { ContextSelector } from "@/components/vysen-dock/context-selector";
import type { ContextArea } from "@/components/vysen-dock/types";

interface FloatingComposerProps {
  composerRef: RefObject<HTMLTextAreaElement | null>;
  contextRef: RefObject<HTMLDivElement | null>;
  input: string;
  canSend: boolean;
  isContextOpen: boolean;
  contextArea: ContextArea;
  voiceRealtimeEnabled: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  supportedVoiceInput: boolean;
  onInputChange: (value: string) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onToggleContext: () => void;
  onSelectArea: (area: ContextArea) => void;
  onSend: () => void;
  onToggleVoiceRealtime: () => void;
}

export function FloatingComposer({
  composerRef,
  contextRef,
  input,
  canSend,
  isContextOpen,
  contextArea,
  voiceRealtimeEnabled,
  isListening,
  isSpeaking,
  supportedVoiceInput,
  onInputChange,
  onInputKeyDown,
  onToggleContext,
  onSelectArea,
  onSend,
  onToggleVoiceRealtime,
}: FloatingComposerProps) {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-3 pt-6">
      <div className="vysen-surface-floating pointer-events-auto relative rounded-[28px] transition focus-within:border-brand-neon/35">
        <div className="px-4 pt-3">
          <textarea
            ref={composerRef}
            rows={2}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Peça um ajuste, um resumo ou a proxima acao"
            className="min-h-[72px] w-full flex-1 resize-none rounded-2xl border border-brand-border/70 bg-brand-surface px-3 py-2 text-[15px] leading-7 text-brand-text outline-none placeholder:text-brand-muted"
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-brand-border/80 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            {voiceRealtimeEnabled && (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
                  isListening
                    ? "border-brand-neon/45 bg-brand-neon/10 text-brand-text"
                    : "border-brand-border bg-brand-surface/42 text-brand-muted"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isListening ? "animate-pulse bg-brand-neon" : "bg-brand-muted"}`} />
                {isSpeaking ? "falando" : isListening ? "ouvindo" : "pausado"}
              </span>
            )}

            <ContextSelector
              contextRef={contextRef}
              contextArea={contextArea}
              isOpen={isContextOpen}
              onToggle={onToggleContext}
              onSelectArea={onSelectArea}
            />
          </div>

          <Button
            type="button"
            onClick={onSend}
            disabled={!canSend}
            size="sm"
            className="h-10 min-w-10 rounded-full px-3"
          >
            <SendHorizontal className="h-3.5 w-3.5" />
          </Button>

          <button
            type="button"
            onClick={onToggleVoiceRealtime}
            disabled={!supportedVoiceInput}
            className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border transition disabled:opacity-45 ${
              voiceRealtimeEnabled
                ? "border-brand-neon/45 bg-brand-neon/10 text-brand-text"
                : "border-brand-border bg-brand-surface/42 text-brand-muted hover:text-brand-text"
            }`}
            title={
              supportedVoiceInput
                ? voiceRealtimeEnabled
                  ? "Desativar conversa em tempo real"
                  : "Ativar conversa em tempo real"
                : "Seu navegador não suporta reconhecimento de voz"
            }
            aria-label={voiceRealtimeEnabled ? "Desativar conversa em tempo real" : "Ativar conversa em tempo real"}
          >
            {voiceRealtimeEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </footer>
  );
}
