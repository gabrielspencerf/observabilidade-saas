"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RoleOption } from "@/server/admin/roles";
import type { UserRow } from "@/server/admin/users";
import { Button } from "@/components/ui/button";
import { adminPost } from "@/features/shared/api/admin-api-client";

interface AddMembershipFormProps {
  tenantId: string;
  tenantName: string;
  roles: RoleOption[];
  users: UserRow[];
  existingUserIds: string[];
}

export function AddMembershipForm({
  tenantId,
  tenantName,
  roles,
  users,
  existingUserIds,
}: AddMembershipFormProps) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const availableUsers = users.filter((u) => !existingUserIds.includes(u.id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userId || !roleSlug) {
      setError("Selecione usuário e role");
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
    setUserId("");
    setRoleSlug("");
    router.refresh();
    setSubmitting(false);
  }

  if (availableUsers.length === 0) {
    return (
      <p className="mt-2 text-sm text-brand-muted">
        Todos os usuários já possuem membership em {tenantName}.
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
        <label htmlFor="user_id" className="block text-xs font-medium text-brand-muted mb-1.5">
          Usuário
        </label>
        <select
          id="user_id"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border border-brand-border bg-brand-dark px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-brand-neon transition-colors"
        >
          <option value="" className="bg-brand-dark text-brand-text">Selecione</option>
          {availableUsers.map((u) => (
            <option key={u.id} value={u.id} className="bg-brand-dark text-brand-text">
              {u.name ?? u.email} ({u.email})
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
