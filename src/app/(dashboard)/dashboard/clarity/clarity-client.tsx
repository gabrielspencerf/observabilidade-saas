"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function NewClarityConnectionForm() {
  const router = useRouter();
  const [apiToken, setApiToken] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/dashboard/clarity/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: apiToken.trim(), label: label.trim() || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Erro ao salvar");
        return;
      }
      setApiToken("");
      setLabel("");
      setMsg("Conexão criada.");
      router.refresh();
    } catch {
      setMsg("Falha de rede");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="panel-lux max-w-lg space-y-3 rounded-lg border border-brand-border bg-brand-surface p-4"
    >
      <div>
        <label className="text-sm text-brand-muted">Chave de acesso (Clarity)</label>
        <input
          type="password"
          autoComplete="off"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          required
          className="mt-1 w-full rounded border border-brand-border bg-brand-dark/50 px-3 py-2 text-sm text-brand-text"
        />
      </div>
      <div>
        <label className="text-sm text-brand-muted">Rótulo (opcional)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mt-1 w-full rounded border border-brand-border bg-brand-dark/50 px-3 py-2 text-sm text-brand-text"
        />
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Salvando…" : "Adicionar projeto"}
      </Button>
      {msg ? <p className="text-xs text-brand-muted">{msg}</p> : null}
    </form>
  );
}

export function ClarityConnectionActions({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/dashboard/clarity/sync/${connectionId}`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Erro ao iniciar sincronização");
        return;
      }
      setMsg("Sincronização iniciada. Os dados serão atualizados em instantes.");
      router.refresh();
    } catch {
      setMsg("Falha de rede");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Remover esta conexão Clarity?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/dashboard/clarity/connections/${connectionId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Erro ao remover");
        return;
      }
      router.refresh();
    } catch {
      setMsg("Falha de rede");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => sync()}>
        Sincronizar
      </Button>
      <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => remove()}>
        Remover
      </Button>
      {msg ? <span className="text-xs text-brand-muted">{msg}</span> : null}
    </div>
  );
}
