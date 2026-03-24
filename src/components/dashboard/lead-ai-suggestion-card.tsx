"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

interface LeadAiSuggestionCardProps {
  leadId: string;
  suggestedStatus: string;
  confidenceScore: number | null;
  commercialErrors: string[];
}

export function LeadAiSuggestionCard({
  leadId,
  suggestedStatus,
  confidenceScore,
  commercialErrors,
}: LeadAiSuggestionCardProps) {
  const [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setApplying(true);
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: suggestedStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Falha ao aplicar sugestão.");
        return;
      }
      setFeedback("Sugestão aplicada com sucesso.");
    } catch {
      setError("Falha de conexão ao aplicar sugestão.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-neon/30 bg-brand-surface p-4">
      <p className="text-xs uppercase tracking-wide text-brand-neon">Sugestão da IA</p>
      <p className="mt-2 text-sm text-brand-text">
        Mudança sugerida de status: <strong>{suggestedStatus}</strong>
        {confidenceScore !== null ? ` (confiança ${(confidenceScore * 100).toFixed(0)}%)` : ""}
      </p>
      {commercialErrors.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-brand-muted">
          {commercialErrors.slice(0, 4).map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      )}
      {error && (
        <p className="mt-3 rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300">
          {error}
        </p>
      )}
      {feedback && (
        <p className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
          {feedback}
        </p>
      )}
      <Button
        type="button"
        onClick={handleApply}
        disabled={applying}
        className="mt-3"
      >
        {applying ? "Aplicando…" : "Aplicar sugestão"}
      </Button>
    </div>
  );
}
