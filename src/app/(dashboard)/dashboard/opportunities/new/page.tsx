"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { PageSection, DashboardPageHeader } from "@/components/layout";
import { Button, Input } from "@/components/ui";

const STAGES = [
  { value: "open", label: "Aberta" },
  { value: "qualified", label: "Qualificada" },
  { value: "negotiating", label: "Em negociação" },
  { value: "won", label: "Ganha" },
  { value: "lost", label: "Perdida" },
];

export default function NewOpportunityPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState("open");
  const [contractedModel, setContractedModel] = useState("");
  const [jobValue, setJobValue] = useState("");
  const [contactStartedAt, setContactStartedAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          stage,
          contracted_model: contractedModel.trim() || undefined,
          job_value: jobValue.trim() || undefined,
          contact_started_at: contactStartedAt
            ? new Date(contactStartedAt).toISOString()
            : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar oportunidade.");
        return;
      }
      router.push("/dashboard/opportunities");
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageSection variant="plain" className="px-1 py-0 sm:px-2 md:px-2 md:pt-0 md:pb-0">
      <DashboardPageHeader
        title="Nova oportunidade"
        description="Cadastrar uma oportunidade comercial manualmente."
        icon={TrendingUp}
      />
      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-xl space-y-4 rounded-xl border border-brand-border bg-brand-surface p-5"
      >
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {error}
          </div>
        )}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-brand-muted">
            Título
          </label>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Implantação CRM - Cliente X"
            className="mt-1 bg-brand-dark/50 border-brand-border text-brand-text"
            maxLength={255}
          />
        </div>
        <div>
          <label htmlFor="stage" className="block text-sm font-medium text-brand-muted">
            Estágio
          </label>
          <select
            id="stage"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-border bg-brand-dark/50 px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-neon"
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="contractedModel" className="block text-sm font-medium text-brand-muted">
            Modelo contratado (opcional)
          </label>
          <Input
            id="contractedModel"
            type="text"
            value={contractedModel}
            onChange={(e) => setContractedModel(e.target.value)}
            placeholder="Ex: Mensal Pro / Anual Plus"
            className="mt-1 bg-brand-dark/50 border-brand-border text-brand-text"
            maxLength={128}
          />
        </div>
        <div>
          <label htmlFor="jobValue" className="block text-sm font-medium text-brand-muted">
            Valor (BRL)
          </label>
          <Input
            id="jobValue"
            type="number"
            min={0}
            step="0.01"
            value={jobValue}
            onChange={(e) => setJobValue(e.target.value)}
            placeholder="0.00"
            className="mt-1 bg-brand-dark/50 border-brand-border text-brand-text"
          />
        </div>
        <div>
          <label
            htmlFor="contactStartedAt"
            className="block text-sm font-medium text-brand-muted"
          >
            Início do contato comercial
          </label>
          <Input
            id="contactStartedAt"
            type="datetime-local"
            value={contactStartedAt}
            onChange={(e) => setContactStartedAt(e.target.value)}
            className="mt-1 bg-brand-dark/50 border-brand-border text-brand-text"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} variant="primary" className="btn-cta-primary">
            {submitting ? "Criando…" : "Criar oportunidade"}
          </Button>
          <Link href="/dashboard/opportunities">
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </PageSection>
  );
}
