"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { adminDelete, adminPatch } from "@/features/shared/api/admin-api-client";

export interface MembershipRoleOption {
  id: string;
  slug: string;
  name: string;
}

/**
 * Controles inline para uma linha de membership: select para trocar role
 * (PATCH) + botão DELETE com confirmação. Refresca o router em sucesso.
 */
export function MembershipRoleControls({
  membershipId,
  currentRoleSlug,
  roles,
  userLabel,
}: {
  membershipId: string;
  currentRoleSlug: string;
  roles: MembershipRoleOption[];
  userLabel: string;
}) {
  const router = useRouter();
  const [roleSlug, setRoleSlug] = useState(currentRoleSlug);
  const [savingRole, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleRoleChange(next: string) {
    if (next === currentRoleSlug) {
      setRoleSlug(next);
      return;
    }
    setError(null);
    setRoleSlug(next);
    startTransition(async () => {
      const result = await adminPatch(`/api/admin/memberships/${membershipId}`, {
        role_slug: next,
      });
      if (result.error) {
        setError(result.error.message);
        setRoleSlug(currentRoleSlug);
        return;
      }
      router.refresh();
    });
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    const result = await adminDelete(`/api/admin/memberships/${membershipId}`);
    if (result.error) {
      setError(result.error.message);
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={roleSlug}
        onChange={(e) => handleRoleChange(e.target.value)}
        disabled={savingRole || deleting}
        aria-label={`Role de ${userLabel}`}
        className="rounded-md border border-brand-border bg-brand-dark px-2 py-1 text-xs text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-neon disabled:opacity-60"
      >
        {roles.map((r) => (
          <option key={r.id} value={r.slug}>
            {r.name} ({r.slug})
          </option>
        ))}
      </select>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={deleting}
          className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/5 px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/15 disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remover
        </button>
      ) : (
        <div className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1">
          <span className="text-xs text-red-300">Confirmar?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded bg-red-500/90 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {deleting ? "Removendo…" : "Sim"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="rounded border border-brand-border bg-brand-surface px-2 py-0.5 text-xs text-brand-muted hover:text-brand-text"
          >
            Não
          </button>
        </div>
      )}
      {error && <span className="text-xs text-red-300">{error}</span>}
    </div>
  );
}
