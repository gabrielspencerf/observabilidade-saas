"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { AppModal } from "@/components/ui/app-modal";
import { Eye, FileSpreadsheet, Loader2, X } from "lucide-react";

interface PreviewPayload {
  headers: string[];
  rows: string[][];
  totalQualifiedLeads: number;
  missingTrackingIdentifiers: number;
}

const INPUT_CLASS =
  "rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-neon/40";
const PREVIEW_MODAL_PANEL_BASE_CLASS =
  "relative w-full max-w-6xl rounded-2xl border border-brand-border bg-brand-surface p-5 shadow-2xl";

export function OfflineGoogleSheetActions() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewClosing, setIsPreviewClosing] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [conversionName, setConversionName] = useState("Lead qualificado");
  const [currencyCode, setCurrencyCode] = useState("BRL");

  const downloadHref = useMemo(() => {
    const p = new URLSearchParams();
    if (conversionName.trim()) p.set("conversionName", conversionName.trim());
    if (currencyCode.trim()) p.set("currencyCode", currencyCode.trim().toUpperCase());
    const query = p.toString();
    return `/api/dashboard/google-ads/offline-conversions/export${query ? `?${query}` : ""}`;
  }, [conversionName, currencyCode]);

  async function loadPreview() {
    setIsPreviewClosing(false);
    setIsPreviewOpen(true);
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const p = new URLSearchParams();
      p.set("limit", "15");
      if (conversionName.trim()) p.set("conversionName", conversionName.trim());
      if (currencyCode.trim()) p.set("currencyCode", currencyCode.trim().toUpperCase());

      const res = await fetch(`/api/dashboard/google-ads/offline-conversions/preview?${p.toString()}`);
      const data = (await res.json()) as PreviewPayload | { error?: string };
      if (!res.ok) {
        setPreview(null);
        setPreviewError(
          data && "error" in data ? data.error ?? "Erro ao gerar prévia." : "Erro ao gerar prévia."
        );
        return;
      }
      setPreview(data as PreviewPayload);
    } catch (err) {
      setPreview(null);
      setPreviewError(err instanceof Error ? err.message : "Erro ao carregar prévia.");
    } finally {
      setIsLoadingPreview(false);
    }
  }

  function closePreview() {
    setIsPreviewClosing(true);
    window.setTimeout(() => {
      setIsPreviewOpen(false);
      setIsPreviewClosing(false);
    }, 180);
  }

  return (
    <>
      <div className="panel-lux mt-4 rounded-xl border border-brand-border bg-brand-surface p-4">
        <div className="grid gap-3 lg:grid-cols-[2fr_120px_auto_auto] lg:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted">
            Nome da conversão no Google Ads
            <input
              value={conversionName}
              onChange={(e) => setConversionName(e.target.value)}
              placeholder="Ex.: Lead qualificado"
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-brand-muted">
            Moeda
            <input
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="BRL"
              className={INPUT_CLASS}
              maxLength={3}
            />
          </label>

          <a
            href={downloadHref}
            className="fx-button inline-flex items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-text hover:bg-brand-surface/80"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Gerar planilha modelo
          </a>

          <Button type="button" variant="secondary" className="gap-2" onClick={loadPreview}>
            <Eye className="h-4 w-4" />
            Pré-visualizar popup
          </Button>
        </div>
        <p className="mt-2 text-xs text-brand-muted">
          A planilha já sai no formato para importação de conversões offline. Confira a prévia antes de enviar ao Google Ads.
        </p>
      </div>

      <AppModal
        isOpen={isPreviewOpen}
        isClosing={isPreviewClosing}
        onClose={closePreview}
        labelledBy="offline-preview-modal-title"
        describedBy="offline-preview-modal-description"
        panelClassName={`${PREVIEW_MODAL_PANEL_BASE_CLASS} ${
          isPreviewClosing
            ? "animate-out fade-out zoom-out-95 slide-out-to-bottom-2 duration-200"
            : "animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200"
        }`}
      >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="offline-preview-modal-title" className="text-base font-semibold text-brand-text">
                  Prévia da planilha Google (conversões offline)
                </h3>
                <p id="offline-preview-modal-description" className="text-sm text-brand-muted">
                  Exemplo dos primeiros registros que serão exportados.
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="rounded-md p-1 text-brand-muted hover:bg-brand-dark hover:text-brand-text"
                aria-label="Fechar prévia"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoadingPreview ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-brand-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando prévia...
                </div>
                <div className="rounded-xl border border-brand-border bg-brand-dark/20 p-3">
                  <div className="popup-loading-shimmer h-2 w-full rounded-full" />
                  <div className="popup-loading-shimmer mt-3 h-8 w-1/2 rounded-md" />
                  <div className="popup-loading-shimmer mt-2 h-24 w-full rounded-md" />
                </div>
              </div>
            ) : previewError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                {previewError}
              </div>
            ) : preview ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-brand-muted">
                  <span className="rounded-md border border-brand-border px-2 py-1">
                    Linhas na prévia: {preview.rows.length}
                  </span>
                  <span className="rounded-md border border-brand-border px-2 py-1">
                    Leads qualificados considerados: {preview.totalQualifiedLeads}
                  </span>
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-300">
                    Sem GCLID/GBRAID/WBRAID: {preview.missingTrackingIdentifiers}
                  </span>
                </div>

                {preview.rows.length === 0 ? (
                  <div className="rounded-xl border border-brand-border bg-brand-dark/10 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-brand-text">
                      Nenhum lead com status qualificado encontrado.
                    </p>
                    <p className="mt-1 text-xs text-brand-muted">
                      Assim que existirem leads qualificados, a prévia da planilha aparece aqui.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[55vh] overflow-auto rounded-xl border border-brand-border">
                    <table className="min-w-[1200px] w-full text-left text-xs">
                      <thead className="sticky top-0 bg-brand-dark/90">
                        <tr>
                          {preview.headers.map((header) => (
                            <th key={header} className="border-b border-brand-border px-3 py-2 font-medium text-brand-muted">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, rowIdx) => (
                          <tr key={`preview-row-${rowIdx}`} className="odd:bg-brand-surface even:bg-brand-dark/10">
                            {row.map((cell, cellIdx) => (
                              <td key={`cell-${rowIdx}-${cellIdx}`} className="border-b border-brand-border/50 px-3 py-2 text-brand-text">
                                {cell || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <a
                    href={downloadHref}
                    className="fx-button inline-flex items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-text hover:bg-brand-surface/80"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Baixar planilha
                  </a>
                  <a
                    href="https://ads.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fx-button inline-flex items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-surface px-4 py-2 text-sm font-medium text-brand-text hover:bg-brand-surface/80"
                  >
                    Abrir Google Ads
                  </a>
                </div>
              </>
            ) : null}
      </AppModal>
    </>
  );
}
