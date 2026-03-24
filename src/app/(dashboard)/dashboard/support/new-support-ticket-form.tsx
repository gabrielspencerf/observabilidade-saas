"use client";

import { useState } from "react";
import { Button, Card, CardContent, Input } from "@/components/ui";

export function NewSupportTicketForm() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!body.trim()) {
      setError("Descreva seu chamado de suporte.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim() || undefined,
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao abrir chamado");
        return;
      }
      setSubject("");
      setBody("");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-brand-border bg-brand-surface">
      <CardContent className="p-6">
        <h2 className="text-base font-semibold text-brand-text">Abrir chamado</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Informe o contexto para acelerar o atendimento: impacto, comportamento esperado e data/hora do ocorrido.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label htmlFor="support-subject" className="mb-1 block text-sm font-medium text-brand-muted">
              Assunto (opcional)
            </label>
            <Input
              id="support-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex.: Erro ao importar leads"
              maxLength={255}
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="support-body" className="mb-1 block text-sm font-medium text-brand-muted">
              Detalhes do chamado <span className="text-red-500">*</span>
            </label>
            <textarea
              id="support-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Descreva o problema e os passos para reproduzir..."
              rows={4}
              className="w-full rounded-2xl border border-brand-border bg-brand-surface/50 px-5 py-3 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-neon/40 focus:border-brand-neon disabled:opacity-50 transition-colors backdrop-blur-sm"
            />
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enviando..." : "Abrir chamado"}
            </Button>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
