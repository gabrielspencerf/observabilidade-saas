"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { PageSection } from "@/components/layout";
import { DashboardPageHeader } from "@/components/layout";
import { Button, Input } from "@/components/ui";

const STATUSES = [
  { value: "new", label: "Novo" },
  { value: "contacted", label: "Contatado" },
  { value: "qualified", label: "Qualificado" },
  { value: "converted", label: "Convertido" },
  { value: "lost", label: "Perdido" },
  { value: "bad_lead", label: "Lead ruim" },
];

export default function NewLeadPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("new");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() && !email.trim() && !phone.trim()) {
      setError("Informe pelo menos nome, e-mail ou telefone.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/dashboard/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          status,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar lead.");
        return;
      }
      router.push(`/dashboard/leads/${data.id}`);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageSection variant="plain" className="px-1 py-0 sm:px-2 md:px-2 md:pt-0 md:pb-0">
      <DashboardPageHeader
        title="Novo lead"
        description="Cadastrar um lead manualmente. Os canais conectados criam leads automaticamente; use esta tela apenas para casos pontuais."
        icon={Users}
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
          <label htmlFor="name" className="block text-sm font-medium text-brand-muted">
            Nome
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do lead"
            className="mt-1 bg-brand-dark/50 border-brand-border text-brand-text"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-brand-muted">
            E-mail
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="lead@empresa.com"
            className="mt-1 bg-brand-dark/50 border-brand-border text-brand-text"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-brand-muted">
            Telefone
          </label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+55 11 99999-9999"
            className="mt-1 bg-brand-dark/50 border-brand-border text-brand-text"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-brand-muted">
            Status inicial
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-brand-border bg-brand-dark/50 px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-neon"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-brand-muted">
          Pelo menos um de nome, e-mail ou telefone é obrigatório. Duplicatas
          por e-mail ou telefone serão rejeitadas.
        </p>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} variant="primary" className="btn-cta-primary">
            {submitting ? "Criando…" : "Criar lead"}
          </Button>
          <Link href="/dashboard/leads">
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </PageSection>
  );
}
