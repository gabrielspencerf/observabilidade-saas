"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function MetaPixelForm({
  accountId,
  initialPixelId,
}: {
  accountId: string;
  initialPixelId: string | null;
}) {
  const router = useRouter();
  const [pixelId, setPixelId] = useState(initialPixelId ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/dashboard/meta-ads/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, pixelId: pixelId.trim() || null }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Erro ao salvar");
        return;
      }
      setMsg("Pixel salvo.");
      router.refresh();
    } catch {
      setMsg("Falha de rede");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <label className="text-xs text-brand-muted">Pixel ID (CAPI)</label>
        <input
          value={pixelId}
          onChange={(e) => setPixelId(e.target.value)}
          placeholder="Ex: 123456789012345"
          className="mt-1 w-full rounded border border-brand-border bg-brand-dark/50 px-2 py-1.5 font-mono text-sm text-brand-text"
        />
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Salvando…" : "Salvar pixel"}
      </Button>
      {msg ? <p className="text-xs text-brand-muted sm:ml-2">{msg}</p> : null}
    </form>
  );
}

export function MetaCapiPanel({
  accountId,
  hasPixel,
}: {
  accountId: string;
  hasPixel: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{
    rows: Array<{ leadId: string; status: string; hasFbcOrUserData: boolean }>;
    totalQualified: number;
    totalConverted: number;
  } | null>(null);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  async function loadPreview() {
    setBusy(true);
    setSendMsg(null);
    try {
      const res = await fetch("/api/dashboard/meta-ads/capi/preview?limit=20");
      const data = await res.json();
      if (!res.ok) {
        setPreview(null);
        setSendMsg((data as { error?: string }).error ?? "Erro ao carregar preview");
        return;
      }
      setPreview(data as typeof preview);
    } catch {
      setSendMsg("Falha de rede");
    } finally {
      setBusy(false);
    }
  }

  async function sendFirstN(n: number) {
    if (!preview?.rows.length) return;
    const leadIds = preview.rows.slice(0, n).map((r) => r.leadId);
    setBusy(true);
    setSendMsg(null);
    try {
      const res = await fetch("/api/dashboard/meta-ads/capi/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, leadIds }),
      });
      const data = (await res.json()) as { error?: string; eventsReceived?: number };
      if (!res.ok) {
        setSendMsg(data.error ?? "Erro ao enviar");
        return;
      }
      setSendMsg(`Enviado: ${data.eventsReceived ?? leadIds.length} evento(s).`);
    } catch {
      setSendMsg("Falha de rede");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded border border-brand-border/80 bg-brand-dark/20 p-3">
      <p className="text-sm font-medium text-brand-text">Conversions API (CAPI)</p>
      <p className="mt-1 text-xs text-brand-muted">
        Preview a partir de leads qualificados e convertidos (fbclid → fbc, email/telefone hasheados).
        Configure o Pixel ID acima antes de enviar.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => loadPreview()}>
          {busy ? "…" : "Carregar preview"}
        </Button>
        {preview && hasPixel ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={busy || preview.rows.length === 0}
              onClick={() => sendFirstN(Math.min(10, preview.rows.length))}
            >
              Enviar até 10
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy || preview.rows.length === 0}
              onClick={() => sendFirstN(Math.min(50, preview.rows.length))}
            >
              Enviar até 50
            </Button>
          </>
        ) : null}
      </div>
      {preview ? (
        <p className="mt-2 text-xs text-brand-muted">
          Amostra: {preview.totalQualified} qualificados + {preview.totalConverted} convertidos (limitado).
          Com sinal (fbc/email/tel):{" "}
          {preview.rows.filter((r) => r.hasFbcOrUserData).length}/{preview.rows.length}
        </p>
      ) : null}
      {sendMsg ? <p className="mt-2 text-xs text-brand-text">{sendMsg}</p> : null}
      {!hasPixel ? (
        <p className="mt-2 text-xs text-amber-600/90">Defina o Pixel ID para habilitar o envio.</p>
      ) : null}
    </div>
  );
}
