"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserCircle } from "lucide-react";
import { PageSection, DashboardPageHeader } from "@/components/layout";
import { Button, Input } from "@/components/ui";

export default function NewContactPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
      const res = await fetch("/api/dashboard/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar contato.");
        return;
      }
      router.push(`/dashboard/contacts/${data.id}/edit`);
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
        title="Novo contato"
        description="Cadastrar um contato manualmente. Importar CSV é mais rápido para volumes."
        icon={UserCircle}
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
            placeholder="Nome do contato"
            className="mt-1 bg-brand-dark/50 border-brand-border text-brand-text"
            maxLength={255}
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
            placeholder="contato@empresa.com"
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
        <p className="text-xs text-brand-muted">
          Pelo menos um de nome, e-mail ou telefone é obrigatório. Duplicatas
          por e-mail ou telefone são rejeitadas.
        </p>
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} variant="primary" className="btn-cta-primary">
            {submitting ? "Criando…" : "Criar contato"}
          </Button>
          <Link href="/dashboard/contacts">
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </PageSection>
  );
}
