"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface VysenCopilotChatProps {
  tenantId?: string | null;
  endpoint?: string;
  title?: string;
  description?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export function VysenCopilotChat({
  tenantId,
  endpoint = "/api/admin/vysen/chat",
  title = "Modo analítico",
  description = "Pergunte sobre gargalos, funil, campanhas e recomendações estratégicas.",
}: VysenCopilotChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    const nextQuestion = question.trim();
    if (!nextQuestion || loading) return;
    setLoading(true);
    setError(null);
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: nextQuestion }]);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: nextQuestion, tenantId }),
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

  return (
    <section className="rounded-xl border border-brand-border bg-brand-surface/70 p-3">
      <h3 className="text-sm font-semibold text-brand-text">{title}</h3>
      <p className="mt-1 text-xs text-brand-muted">{description}</p>

      <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-xs text-brand-muted">Sem perguntas ainda.</p>
        ) : (
          messages.map((message, idx) => (
            <div
              key={`${message.role}-${idx}`}
              className={`rounded-lg border px-2 py-1.5 text-xs ${
                message.role === "user"
                  ? "border-brand-neon/30 bg-brand-neon/10 text-brand-text"
                  : "border-brand-border bg-brand-surface/50 text-brand-muted"
              }`}
            >
              {message.text}
            </div>
          ))
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="mt-3 space-y-2">
        <textarea
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ex.: Onde está o maior gargalo entre aquisição e fechamento?"
          className="w-full rounded-lg border border-brand-border bg-brand-surface/40 px-2 py-1.5 text-xs text-brand-text outline-none focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/30"
        />
        <Button type="button" onClick={ask} disabled={loading || !question.trim()} size="sm">
          {loading ? "Analisando..." : "Perguntar para Vysen"}
        </Button>
      </div>
    </section>
  );
}

