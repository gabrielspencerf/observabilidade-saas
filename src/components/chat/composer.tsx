"use client";

import { useRef, useState } from "react";
import { Mic, MicOff, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui";

interface ComposerProps {
  onSend: (text: string) => Promise<boolean> | boolean;
  loading: boolean;
  placeholder?: string;
  quickPrompts?: readonly string[];
  quickPromptMode?: "prefill" | "send";
}

interface ISpeechRecognitionResultItem {
  transcript: string;
}

interface ISpeechRecognitionResult {
  [index: number]: ISpeechRecognitionResultItem;
}

interface ISpeechRecognitionEvent {
  results: ArrayLike<ISpeechRecognitionResult>;
}

interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

export function Composer({
  onSend,
  loading,
  placeholder = "Peça um ajuste, um resumo ou a próxima ação",
  quickPrompts = [],
  quickPromptMode = "prefill",
}: ComposerProps) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const sendingRef = useRef(false);
  const textareaId = "vysen-chat-composer-input";
  const hintId = "vysen-chat-composer-hint";
  const showQuickPrompts = quickPrompts.length > 0 && !loading && input.trim().length === 0;

  async function handleSend(textOverride?: string) {
    if (sendingRef.current || loading) return;
    const text = (textOverride ?? input).trim();
    if (!text) return;
    sendingRef.current = true;
    const success = await onSend(text);
    if (success && !textOverride) {
      setInput("");
    }
    sendingRef.current = false;
  }

  function startVoiceRecognition() {
    if (typeof window === "undefined" || isListening) return;
    const speechApi = window as unknown as {
      SpeechRecognition?: new () => ISpeechRecognition;
      webkitSpeechRecognition?: new () => ISpeechRecognition;
    };
    const RecognitionCtor = speechApi.SpeechRecognition ?? speechApi.webkitSpeechRecognition;
    if (!RecognitionCtor) return;

    const recognition = new RecognitionCtor();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      if (!transcript) return;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  }

  return (
    <footer className="absolute inset-x-0 bottom-0 z-20 px-4 pb-3 pt-6">
      <div className="vysen-surface-floating relative rounded-[28px] px-3 pb-3 pt-3 transition focus-within:border-brand-neon/35">
        <div className="px-1">
          <textarea
            id={textareaId}
            rows={2}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder={placeholder}
            aria-label="Mensagem para o chat da Vysen"
            aria-describedby={hintId}
            className="min-h-[88px] w-full resize-none rounded-2xl border border-transparent bg-transparent px-4 py-3 text-[15px] leading-7 text-brand-text outline-none placeholder:text-brand-muted"
          />
        </div>

        <div className="mt-2 space-y-2.5 px-1">
          <div
            className={`overflow-hidden transition-all duration-250 ${
              showQuickPrompts ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="flex flex-wrap gap-2 pb-0.5">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    if (quickPromptMode === "send") {
                      void handleSend(prompt);
                      return;
                    }
                    setInput(prompt);
                  }}
                  disabled={loading}
                  className="rounded-full border border-brand-border bg-brand-surface/76 px-3 py-1.5 text-sm text-brand-muted transition hover:bg-brand-dark/25 hover:text-brand-text disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span id={hintId} className="text-xs text-brand-muted">
              Enter envia · Shift+Enter quebra linha
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startVoiceRecognition}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border transition ${
                  isListening
                    ? "border-brand-neon/45 bg-brand-neon/10 text-brand-text"
                    : "border-brand-border bg-brand-surface/42 text-brand-muted hover:text-brand-text"
                }`}
                aria-label={isListening ? "Capturando áudio" : "Ditado por voz"}
              >
                {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
              <Button
                type="button"
                onClick={() => void handleSend()}
                disabled={loading || sendingRef.current || !input.trim()}
                size="sm"
                className="h-10 min-w-10 rounded-full px-3"
              >
                <SendHorizontal className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
