"use client";

import { useEffect, useState } from "react";
import { PageSection } from "@/components/layout";
import { Button, Input, Card, CardContent } from "@/components/ui";

interface ProfilePayload {
  id: string;
  email: string;
  name: string | null;
}

export default function DashboardSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    fetch("/api/context/profile")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data?.error ?? "Não foi possível carregar perfil");
          return;
        }
        setProfile(data as ProfilePayload);
        setName((data as ProfilePayload).name ?? "");
      })
      .catch(() => setError("Falha de conexão"))
      .finally(() => setLoading(false));
  }, []);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch("/api/context/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não foi possível salvar");
        return;
      }
      setSuccess("Perfil atualizado com sucesso.");
      setProfile((prev) => (prev ? { ...prev, name: data.name ?? null } : prev));
    } catch {
      setError("Falha de conexão");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageSection>
      <h1 className="text-2xl font-semibold text-brand-text">Configurações</h1>
      <p className="mt-1 text-sm text-brand-muted">
        Atualize os dados básicos do seu perfil de acesso.
      </p>

      <Card className="mt-6 border-brand-border bg-brand-surface">
        <CardContent className="p-6">
          {loading ? (
            <p className="text-sm text-brand-muted">Carregando perfil...</p>
          ) : (
            <form onSubmit={submitForm} className="space-y-4">
              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  {success}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-brand-muted" htmlFor="profile_email">
                  E-mail
                </label>
                <Input
                  id="profile_email"
                  type="email"
                  value={profile?.email ?? ""}
                  readOnly
                  className="mt-1 opacity-80"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-muted" htmlFor="profile_name">
                  Nome
                </label>
                <Input
                  id="profile_name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1"
                  maxLength={255}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar perfil"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </PageSection>
  );
}
