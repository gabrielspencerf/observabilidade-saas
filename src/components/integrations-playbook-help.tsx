"use client";

import { useState } from "react";
import { AppModal } from "@/components/ui/app-modal";

export function IntegrationsPlaybookHelp() {
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
        labelledBy="integrations-playbook-title"
        describedBy="integrations-playbook-description"
        panelClassName="w-full max-w-xl rounded-2xl border border-brand-border bg-brand-surface p-5 shadow-xl"
      >
        <h2 id="integrations-playbook-title" className="text-base font-semibold text-brand-text">
          Playbook rápido de integrações
        </h2>
        <p id="integrations-playbook-description" className="mt-1 text-sm text-brand-muted">
          Guia rápido para triagem de erros comuns nas integrações.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-brand-muted">
          <li>
            <strong>HTTP 404:</strong> valide a <em>base URL</em> e endpoint de status/health no provedor.
          </li>
          <li>
            <strong>HTTP 401/403:</strong> revise credenciais (token, API key, admin token) e permissões.
          </li>
          <li>
            <strong>Pendente/sem processar:</strong> verifique Redis, worker e fila do provedor correspondente.
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
