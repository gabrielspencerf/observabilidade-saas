"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";

interface BotOption {
  id: string;
  name: string;
}

async function fetchBots(): Promise<BotOption[]> {
  const res = await fetch("/api/admin/integrations/typebot", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { bots?: Array<{ id: string; name?: string; externalId?: string }> };
  return (data.bots ?? []).map((bot) => ({
    id: bot.id,
    name: bot.name ?? bot.externalId ?? bot.id,
  }));
}

export default function TypebotMetricsPage() {
  const [bots, setBots] = useState<BotOption[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [botId, setBotId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ensureBotsLoaded() {
    if (loaded) return;
    const loadedBots = await fetchBots();
    setBots(loadedBots);
    if (loadedBots[0]?.id) setBotId(loadedBots[0].id);
    setLoaded(true);
  }

  async function handleSync(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/integrations/typebot/metrics/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typebot_bot_id: botId,
          from: from || undefined,
          to: to || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Falha ao sincronizar métricas");
        return;
      }
      setMessage(
        `Sync concluído: iniciadas ${data.sessionsStarted}, finalizadas ${data.sessionsCompleted}, abandonadas ${data.sessionsAbandoned}.`
      );
    } catch {
      setError("Falha de conexão");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link href="/admin/integrations" className="text-sm text-brand-neon hover:opacity-90">
          ← Voltar às integrações
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-brand-text">Métricas Typebot (API)</h1>
      <p className="mt-1 text-sm text-brand-muted">
        Dispara sincronização manual de métricas (início, finalização e abandono).
      </p>

      <form
        onSubmit={handleSync}
        onFocus={ensureBotsLoaded}
        className="mt-6 max-w-md space-y-4 rounded-xl border border-brand-border bg-brand-surface p-4"
      >
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {message}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-brand-muted" htmlFor="bot_id">
            Bot
          </label>
          <select
            id="bot_id"
            className="app-select mt-1 block"
            value={botId}
            onChange={(e) => setBotId(e.target.value)}
            required
          >
            <option value="">Selecione</option>
            {bots.map((bot) => (
              <option key={bot.id} value={bot.id}>
                {bot.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-muted" htmlFor="from">
            Início (opcional)
          </label>
          <Input id="from" type="date" className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-muted" htmlFor="to">
            Fim (opcional)
          </label>
          <Input id="to" type="date" className="mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="submit" disabled={submitting || !botId}>
          {submitting ? "Sincronizando..." : "Sincronizar"}
        </Button>
      </form>
    </div>
  );
}
