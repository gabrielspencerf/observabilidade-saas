import type { VysenAdminInsights } from "@/server/vysen/orchestrator";

interface VysenAdminPanelContentProps {
  insights: VysenAdminInsights;
}

function healthLabel(status: "ok" | "warning" | "critical") {
  if (status === "ok") return "Saudável";
  if (status === "warning") return "Atenção";
  return "Crítico";
}

function healthClass(status: "ok" | "warning" | "critical") {
  if (status === "ok") return "text-emerald-400";
  if (status === "warning") return "text-amber-300";
  return "text-red-300";
}

export function VysenAdminPanelContent({ insights }: VysenAdminPanelContentProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-brand-border bg-brand-surface/70 p-3">
        <h3 className="text-sm font-semibold text-brand-text">Resumo estrutural da Vysen</h3>
        <p className="mt-1 text-xs text-brand-muted">
          Atualizado em {new Date(insights.generatedAt).toLocaleTimeString("pt-BR")}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-brand-border/60 p-2">
            <p className="text-brand-muted">Tokens (24h)</p>
            <p className="text-sm font-semibold text-brand-text">
              {insights.kpis.totalTokens24h}
            </p>
          </div>
          <div className="rounded-lg border border-brand-border/60 p-2">
            <p className="text-brand-muted">Uso (24h)</p>
            <p className="text-sm font-semibold text-brand-text">
              {insights.kpis.totalRequests24h}
            </p>
          </div>
          <div className="rounded-lg border border-brand-border/60 p-2">
            <p className="text-brand-muted">Taxa de sucesso</p>
            <p className="text-sm font-semibold text-brand-text">
              {insights.kpis.successRatePercent24h}%
            </p>
          </div>
          <div className="rounded-lg border border-brand-border/60 p-2">
            <p className="text-brand-muted">Usuários ativos</p>
            <p className="text-sm font-semibold text-brand-text">
              {insights.kpis.uniqueUsers24h}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-brand-border bg-brand-surface/70 p-3">
        <h3 className="text-sm font-semibold text-brand-text">Saúde da estrutura</h3>
        <ul className="mt-2 space-y-1 text-xs">
          <li className="flex items-center justify-between">
            <span className="text-brand-muted">Plataforma</span>
            <span className={healthClass(insights.health.platform)}>
              {healthLabel(insights.health.platform)}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-brand-muted">Confiabilidade IA</span>
            <span className={healthClass(insights.health.aiReliability)}>
              {healthLabel(insights.health.aiReliability)}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-brand-muted">Operações</span>
            <span className={healthClass(insights.health.operations)}>
              {healthLabel(insights.health.operations)}
            </span>
          </li>
        </ul>
      </section>

      <section className="rounded-xl border border-brand-border bg-brand-surface/70 p-3">
        <h3 className="text-sm font-semibold text-brand-text">Top alertas</h3>
        <ul className="mt-2 space-y-1 text-xs text-brand-muted">
          {insights.alerts.slice(0, 3).map((item, idx) => (
            <li key={`${item}-${idx}`}>- {item}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-brand-border bg-brand-surface/70 p-3">
        <h3 className="text-sm font-semibold text-brand-text">Tokens por usuário (top)</h3>
        <ul className="mt-2 space-y-1 text-xs text-brand-muted">
          {insights.tokensByUserTop.slice(0, 5).map((item, idx) => (
            <li key={`${item.userId}-${idx}`}>
              - {item.userId.slice(0, 8)}... • {item.totalTokens} tokens • {item.requests} req
            </li>
          ))}
          {insights.tokensByUserTop.length === 0 && <li>- Sem dados de uso por usuário ainda.</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-brand-border bg-brand-surface/70 p-3">
        <h3 className="text-sm font-semibold text-brand-text">Falhas recentes da Vysen</h3>
        <ul className="mt-2 space-y-2">
          {insights.recentFailures.slice(0, 6).map((item, idx) => (
            <li key={`${item.createdAt}-${idx}`} className="rounded-lg border border-brand-border/60 p-2">
              <p className="text-xs font-medium text-brand-text">
                {item.operation} • {new Date(item.createdAt).toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-[11px] text-brand-muted">
                tenant: {item.tenantId ?? "global"} • user: {item.userId ?? "system"}
              </p>
              {item.errorMessage && (
                <p className="mt-1 text-[11px] text-red-300">{item.errorMessage}</p>
              )}
            </li>
          ))}
          {insights.recentFailures.length === 0 && (
            <li className="rounded-lg border border-brand-border/60 p-2 text-[11px] text-brand-muted">
              Sem falhas registradas recentemente.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

