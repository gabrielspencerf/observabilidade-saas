"use client";

import { useState } from "react";
import { Button, Card, CardContent, Input } from "@/components/ui";

interface KnowledgeResult {
  title: string;
  sourceType: string;
  sourceUri: string | null;
  score: number;
  content?: string;
}

export function AdminVysenKnowledgeManager() {
  const [scope, setScope] = useState<"global" | "tenant">("global");
  const [tenantId, setTenantId] = useState("");
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("playbook");
  const [sourceUri, setSourceUri] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<KnowledgeResult[]>([]);

  async function ingest() {
    setFeedback(null);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/vysen/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          tenantId: scope === "tenant" ? tenantId.trim() : null,
          title: title.trim(),
          sourceType: sourceType.trim() || "playbook",
          sourceUri: sourceUri.trim() || null,
          content: content.trim(),
          metadata: { origin: "admin_panel" },
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; chunks?: number };
      if (!response.ok) {
        setFeedback(data.error ?? "Falha ao ingerir base.");
        return;
      }
      setFeedback(`Base atualizada com sucesso (${data.chunks ?? 0} chunks).`);
      setTitle("");
      setSourceUri("");
      setContent("");
    } catch {
      setFeedback("Falha de conexão ao ingerir base.");
    } finally {
      setSaving(false);
    }
  }

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const params = new URLSearchParams({
        q,
        scope,
        limit: "5",
      });
      if (scope === "tenant" && tenantId.trim()) {
        params.set("tenantId", tenantId.trim());
      }
      const response = await fetch(`/api/admin/vysen/knowledge?${params.toString()}`);
      const data = (await response.json()) as { results?: KnowledgeResult[] };
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <Card className="border-brand-border bg-brand-surface">
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">Base de conhecimento da Vysen</h2>
          <p className="text-sm text-brand-muted">
            Ingestão vetorial (RAG) com escopo global ou por tenant.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-brand-muted">
            Escopo
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "global" | "tenant")}
              className="mt-1 w-full rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-2 text-sm text-brand-text"
            >
              <option value="global">Global</option>
              <option value="tenant">Tenant</option>
            </select>
          </label>
          <label className="text-sm text-brand-muted">
            Tenant ID (quando escopo tenant)
            <Input
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="uuid do tenant"
              disabled={scope !== "tenant"}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-brand-muted">
            Título
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="text-sm text-brand-muted">
            Tipo da fonte
            <Input value={sourceType} onChange={(e) => setSourceType(e.target.value)} />
          </label>
        </div>

        <label className="block text-sm text-brand-muted">
          URI da fonte (opcional)
          <Input value={sourceUri} onChange={(e) => setSourceUri(e.target.value)} />
        </label>

        <label className="block text-sm text-brand-muted">
          Conteúdo
          <textarea
            rows={7}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 w-full rounded-xl border border-brand-border bg-brand-surface/50 px-3 py-2 text-sm text-brand-text"
          />
        </label>

        <Button
          type="button"
          onClick={ingest}
          disabled={
            saving ||
            !title.trim() ||
            !sourceType.trim() ||
            !content.trim() ||
            (scope === "tenant" && !tenantId.trim())
          }
        >
          {saving ? "Processando..." : "Ingerir documento na base"}
        </Button>

        {feedback && (
          <p className="rounded-lg border border-brand-border/60 bg-brand-surface/50 px-3 py-2 text-sm text-brand-muted">
            {feedback}
          </p>
        )}

        <div className="space-y-2 border-t border-brand-border pt-4">
          <p className="text-sm font-medium text-brand-text">Teste de recuperação semântica</p>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex.: melhores práticas para reduzir CPL"
            />
            <Button type="button" onClick={search} disabled={searching || !query.trim()}>
              {searching ? "Buscando..." : "Buscar"}
            </Button>
          </div>
          <ul className="space-y-2">
            {results.map((item, idx) => (
              <li key={`${item.title}-${idx}`} className="rounded-lg border border-brand-border/60 p-2">
                <p className="text-sm font-medium text-brand-text">{item.title}</p>
                <p className="text-xs text-brand-muted">
                  {item.sourceType} • score {Math.round(item.score * 100)}%
                </p>
                {item.sourceUri && (
                  <p className="text-xs text-brand-muted break-all">{item.sourceUri}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

