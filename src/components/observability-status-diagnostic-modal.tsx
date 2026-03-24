"use client";

import { useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import { ProviderBrandIcon } from "@/components/provider-brand-icon";

interface DiagnosticDetails {
  hint?: string;
  endpointChecked?: string;
  statusCode?: number;
  statusText?: string;
  errorType?: string;
  error?: string;
}

interface ObservabilityStatusDiagnosticModalProps {
  provider: "evolution" | "uazapi";
  instanceId: string;
  details?: DiagnosticDetails;
}

export function ObservabilityStatusDiagnosticModal({
  provider,
  instanceId,
  details,
}: ObservabilityStatusDiagnosticModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!details?.hint && !details?.endpointChecked && !details?.error) {
    return null;
  }

  const titleId = `obs-diagnostic-title-${provider}-${instanceId}`;
  const descriptionId = `obs-diagnostic-description-${provider}-${instanceId}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-2 text-xs text-brand-muted underline-offset-2 transition hover:text-brand-text hover:underline"
      >
        Ver diagnóstico técnico
      </button>

      <AppModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        labelledBy={titleId}
        describedBy={descriptionId}
        panelClassName="w-full max-w-lg rounded-2xl border border-brand-border bg-brand-surface p-5 shadow-xl"
      >
        <h3 id={titleId} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-text">
          <ProviderBrandIcon provider={provider} className="h-4 w-4 rounded" />
          Diagnóstico técnico ({provider === "evolution" ? "Evolution" : "UAZAPI"})
        </h3>
        <p id={descriptionId} className="mt-1 text-xs text-brand-muted">
          Detalhes de conectividade e resposta do provedor para esta instância.
        </p>
        <div className="app-popover mt-3 rounded-lg p-3 text-xs text-brand-text space-y-1.5">
          {details?.hint && <p>Hint: {details.hint}</p>}
          {details?.endpointChecked && <p>Endpoint: {details.endpointChecked}</p>}
          {(details?.statusCode || details?.statusText) && (
            <p>
              HTTP: {details?.statusCode ?? "—"} {details?.statusText ?? ""}
            </p>
          )}
          {details?.errorType && <p>Tipo: {details.errorType}</p>}
          {details?.error && <p>Erro: {details.error}</p>}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-md border border-brand-border px-3 py-1.5 text-sm text-brand-text transition hover:bg-brand-surface"
          >
            Fechar
          </button>
        </div>
      </AppModal>
    </>
  );
}
