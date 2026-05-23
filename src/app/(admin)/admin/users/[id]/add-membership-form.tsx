"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoleOption } from "@/server/admin/roles";
import type { TenantRow } from "@/server/admin/tenants";
import { Button } from "@/components/ui/button";
import { adminPost } from "@/features/shared/api/admin-api-client";

interface AddMembershipFormProps {
  userId: string;
  userName: string;
  roles: RoleOption[];
  tenants: TenantRow[];
  existingTenantIds: string[];
}

export function AddMembershipForm({
  userId,
  roles,
  tenants,
  existingTenantIds,
}: AddMembershipFormProps) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableTenants = tenants.filter((t) => !existingTenantIds.includes(t.id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tenantId || !roleSlug) {
      setError("Selecione tenant e role");
      return;
    }
    setSubmitting(true);
    const result = await adminPost("/api/admin/memberships", {
      user_id: userId,
      tenant_id: tenantId,
      role_slug: roleSlug,
    });
    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }
    setTenantId("");
    setRoleSlug("");
    router.refresh();
    setSubmitting(false);
  }

  if (availableTenants.length === 0) {
    return (
      <p className="mt-2 text-sm text-brand-muted">
        Este usuário já possui membership em todos os tenants.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-wrap items-end gap-4 rounded-xl border border-brand-border bg-brand-surface p-4 shadow-sm"
    >
      {error && (
        <div
          role="alert"
          className="w-full rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-500"
        >
          {error}
        </div>
      )}
      <div className="flex-1 min-w-[200px]">
        <label htmlFor="tenant_id" className="block text-xs font-medium text-brand-muted mb-1.5">
          Tenant
        </label>
        <select
          id="tenant_id"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="w-full rounded-lg border border-brand-border bg-brand-dark px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-neon transition-colors"
        >
          <option value="" className="bg-brand-dark text-brand-text">Selecione</option>
          {availableTenants.map((t) => (
            <option key={t.id} value={t.id} className="bg-brand-dark text-brand-text">
              {t.name} ({t.slug})
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[150px]">
        <label htmlFor="role_slug" className="block text-xs font-medium text-brand-muted mb-1.5">
          Role
        </label>
        <select
          id="role_slug"
          value={roleSlug}
          onChange={(e) => setRoleSlug(e.target.value)}
          className="w-full rounded-lg border border-brand-border bg-brand-dark px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-neon transition-colors"
        >
          <option value="" className="bg-brand-dark text-brand-text">Selecione</option>
          {roles.map((r) => (
            <option key={r.id} value={r.slug} className="bg-brand-dark text-brand-text">
              {r.name} ({r.slug})
            </option>
          ))}
        </select>
      </div>
      <Button
        type="submit"
        disabled={submitting}
        variant="secondary"
        className="border-brand-border text-brand-text hover:bg-brand-dark"
      >
        {submitting ? "Salvando…" : "Vincular"}
      </Button>
    </form>
  );
}
