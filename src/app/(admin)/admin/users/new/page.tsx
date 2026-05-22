"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageSection } from "@/components/layout/page-section";
import { Input, Button } from "@/components/ui";

export default function NewUserPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sendAccessEmail, setSendAccessEmail] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim(),
          password: password.trim() || undefined,
          is_active: isActive,
          send_access_email: sendAccessEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar usuário");
        return;
      }
      if (data?.accessEmail && data.accessEmail.sent === false && data.accessEmail.error) {
        setError(`Usuário criado, mas falhou envio do acesso inicial: ${data.accessEmail.error}`);
        setSubmitting(false);
        return;
      }
      router.push("/superadmin/users");
      router.refresh();
    } catch {
      setError("Erro de conexão");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageSection variant="plain" className="px-1 py-0 sm:px-2 md:px-2 md:pt-0 md:pb-0">
      <div className="mb-6">
        <Link
          href="/superadmin/users"
          className="text-sm text-brand-muted hover:text-brand-text transition-colors"
        >
          ← Voltar
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-brand-text mb-6">Novo usuário</h1>
      <form onSubmit={handleSubmit} className="max-w-md space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-500"
          >
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-brand-text">
            Nome
          </label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-brand-surface border-brand-border text-brand-text"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-brand-text">
            E-mail
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-brand-surface border-brand-border text-brand-text"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-brand-text">
            Senha inicial (opcional)
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-brand-surface border-brand-border text-brand-text"
            minLength={8}
          />
          <p className="mt-1 text-xs text-brand-muted">
            Se vazio, o sistema envia link para definição de senha no primeiro acesso.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="send_access_email"
            type="checkbox"
            checked={sendAccessEmail}
            onChange={(e) => setSendAccessEmail(e.target.checked)}
            className="rounded border-brand-border bg-brand-surface text-brand-neon focus:ring-brand-neon"
          />
          <label htmlFor="send_access_email" className="text-sm text-brand-text">
            Enviar e-mail de acesso inicial (link para definir senha)
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="is_active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-brand-border bg-brand-surface text-brand-neon focus:ring-brand-neon"
          />
          <label htmlFor="is_active" className="text-sm text-brand-text">
            Ativo
          </label>
        </div>
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={submitting}
            >
            {submitting ? "Criando…" : "Criar"}
          </Button>
          <Link href="/superadmin/users">
            <Button type="button" variant="secondary">Cancelar</Button>
          </Link>
        </div>
      </form>
    </PageSection>
  );
}
