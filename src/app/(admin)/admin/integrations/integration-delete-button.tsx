"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";

type Provider = "evolution" | "typebot" | "uazapi";

export function IntegrationDeleteButton({
  id,
  provider,
  label = "Excluir",
}: {
  id: string;
  provider: Provider;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const providerLabel =
    provider === "evolution"
      ? "instância Evolution"
      : provider === "typebot"
        ? "bot Typebot"
        : "instância UAZAPI";

  const path =
    provider === "evolution"
      ? `/api/admin/integrations/evolution/${id}`
      : provider === "typebot"
        ? `/api/admin/integrations/typebot/${id}`
        : `/api/admin/integrations/uazapi/${id}`;

  async function handleDelete() {
    if (
      !confirm(
        `Excluir ${providerLabel}? Conversas e eventos vinculados serão removidos.`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(path, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Erro ao excluir");
        return;
      }
      alert(`${providerLabel} excluída com sucesso.`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={handleDelete}
      disabled={loading}
      aria-label={label}
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </Button>
  );
}
