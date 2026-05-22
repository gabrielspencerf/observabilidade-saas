"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";

export function ContactEditForm({
  contactId,
  defaultValues,
}: {
  contactId: string;
  defaultValues: { name: string; email: string; phone: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultValues.name);
  const [email, setEmail] = useState(defaultValues.email);
  const [phone, setPhone] = useState(defaultValues.phone);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/dashboard/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Erro ao atualizar contato.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
      {saved && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Contato atualizado.
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
          className="mt-1 bg-brand-dark/50 border-brand-border text-brand-text"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting} variant="primary" className="btn-cta-primary">
          {submitting ? "Salvando…" : "Salvar alterações"}
        </Button>
        <Link href="/dashboard/contacts">
          <Button type="button" variant="secondary">
            Voltar
          </Button>
        </Link>
      </div>
    </form>
  );
}
