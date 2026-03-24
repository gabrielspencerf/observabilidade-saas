"use client";

import { useState } from "react";
import { AppModal } from "@/components/ui/app-modal";

export function ObservabilityPlaybookHelp() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center rounded-md border border-brand-border px-2.5 py-1 text-xs font-medium text-brand-muted transition hover:bg-brand-surface hover:text-brand-text"
      >
        Ver playbook
      </button>

      <AppModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        labelledBy="observability-playbook-title"
        describedBy="observability-playbook-description"
        panelClassName="w-full max-w-xl rounded-2xl border border-brand-border bg-brand-surface p-5 shadow-xl"
      >
        <h2 id="observability-playbook-title" className="text-base font-semibold text-brand-text">
          Playbook rápido para status HTTP
        </h2>
        <p id="observability-playbook-description" className="mt-1 text-sm text-brand-muted">
          Guia rápido para triagem de erros de integração.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-brand-muted">
          <li>
            <strong>HTTP 404:</strong> normalmente endpoint de health não existe na versão/rota atual.
            Confirme base URL e path no provedor.
          </li>
          <li>
            <strong>HTTP 401/403:</strong> API key inválida, ausente ou sem permissão.
          </li>
          <li>
            <strong>Timeout/Inacessível:</strong> falha de rede, DNS, firewall, proxy ou indisponibilidade
            do provedor.
          </li>
        </ul>
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
