"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

/**
 * Botão genérico DELETE para recursos do dashboard. Pede confirmação inline
 * (toggle), faz o fetch DELETE e redireciona em sucesso.
 *
 * Uso: <ResourceDeleteButton
 *   endpoint={`/api/dashboard/leads/${lead.id}`}
 *   redirectTo="/dashboard/leads"
 *   label="Excluir lead"
 *   confirmLabel="Confirmar exclusão"
 * />
 */
export function ResourceDeleteButton({
  endpoint,
  redirectTo,
  label = "Excluir",
  confirmLabel = "Confirmar exclusão",
  size = "sm",
}: {
  endpoint: string;
  redirectTo: string;
  label?: string;
  confirmLabel?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sizeClass = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Não foi possível excluir.");
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/5 ${sizeClass} font-medium text-red-300 transition hover:bg-red-500/15`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1">
      <span className="text-xs text-red-300">Tem certeza?</span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded bg-red-500/90 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
      >
        {loading ? "Excluindo…" : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
        disabled={loading}
        className="rounded border border-brand-border bg-brand-surface px-2 py-0.5 text-xs text-brand-muted hover:text-brand-text"
      >
        Cancelar
      </button>
      {error && <span className="ml-2 text-xs text-red-300">{error}</span>}
    </div>
  );
}
