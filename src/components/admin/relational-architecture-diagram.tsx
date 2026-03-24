"use client";

import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import {
  HUB_COPY,
  RELATIONAL_PILLARS,
  type PillarAccent,
  type RelationalPillar,
} from "@/lib/admin/relational-map-data";
import { Activity, Database, HardDrive } from "lucide-react";

function accentHeaderClass(accent: PillarAccent): string {
  switch (accent) {
    case "blue":
      return "bg-gradient-to-r from-sky-600/95 via-blue-600/90 to-indigo-600/85";
    case "violet":
      return "bg-gradient-to-r from-violet-600/95 via-purple-600/90 to-fuchsia-600/80";
    case "amber":
      return "bg-gradient-to-r from-amber-600/95 via-orange-600/88 to-amber-700/85";
    case "emerald":
      return "bg-gradient-to-r from-emerald-600/95 via-teal-600/90 to-cyan-700/85";
    default:
      return "bg-brand-border";
  }
}

function PillarCard({
  pillar,
  register,
}: {
  pillar: RelationalPillar;
  register: (id: string, el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={(el) => register(pillar.id, el)}
      className="relative z-[2] flex h-full flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-md"
    >
      <div className={`px-4 py-3 ${accentHeaderClass(pillar.accent)}`}>
        <h3 className="text-sm font-bold tracking-wide text-white drop-shadow-sm">{pillar.title}</h3>
        <p className="mt-0.5 text-[11px] font-medium text-white/85">{pillar.subtitle}</p>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="rounded-xl border border-brand-border/80 bg-brand-dark/35 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-neon/95">
            {pillar.highlight.label}
          </p>
          <p className="mt-0.5 text-[11px] text-brand-muted">{pillar.highlight.hint}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-muted">Tabelas</p>
          <ul className="mt-1.5 flex max-h-[140px] flex-col gap-1 overflow-y-auto pr-1 text-[10px] leading-tight">
            {pillar.tables.map((t) => (
              <li
                key={t}
                className="border-l border-brand-border/50 pl-2 font-mono text-[10px] text-brand-text/90"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto border-t border-brand-border/60 pt-2">
          <p className="text-[9px] font-semibold uppercase text-brand-muted">→ núcleo</p>
          <p className="mt-0.5 text-[10px] text-brand-muted">{pillar.linksToHub.join(" · ")}</p>
        </div>
      </div>
    </div>
  );
}

export interface RelationalArchitectureDiagramProps {
  hubStats?: {
    backlogTotal: number;
    dlqTotal: number;
    workerOk: boolean;
  };
}

export function RelationalArchitectureDiagram({ hubStats }: RelationalArchitectureDiagramProps) {
  const lineGradId = `relMapLineGrad-${useId().replace(/:/g, "")}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const pillarRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [paths, setPaths] = useState<string[]>([]);

  const registerPillar = useCallback((id: string, el: HTMLDivElement | null) => {
    pillarRefs.current[id] = el;
  }, []);

  const redraw = useCallback(() => {
    const wrap = wrapRef.current;
    const hub = hubRef.current;
    if (!wrap || !hub) return;

    const w = wrap.getBoundingClientRect();
    const hubRect = hub.getBoundingClientRect();
    const hubX = hubRect.left + hubRect.width / 2 - w.left;
    const hubY = hubRect.top - w.top;

    const next: string[] = [];
    for (const p of RELATIONAL_PILLARS) {
      const el = pillarRefs.current[p.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const x1 = r.left + r.width / 2 - w.left;
      const y1 = r.bottom - w.top;
      const midY = y1 + (hubY - y1) * 0.45;
      // Curva suave até o topo do hub
      next.push(`M ${x1} ${y1} C ${x1} ${midY}, ${hubX} ${midY}, ${hubX} ${hubY}`);
    }
    setPaths(next);
  }, []);

  useLayoutEffect(() => {
    redraw();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => redraw()) : null;
    if (wrapRef.current && ro) ro.observe(wrapRef.current);
    window.addEventListener("resize", redraw);
    return () => {
      window.removeEventListener("resize", redraw);
      ro?.disconnect();
    };
  }, [redraw]);

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-2xl border border-brand-border bg-brand-surface/25 px-3 py-8 sm:px-6"
      style={{
        backgroundImage:
          "radial-gradient(rgb(var(--color-brand-border) / 0.5) 1px, transparent 1px)",
        backgroundSize: "14px 14px",
      }}
    >
      <svg
        className="pointer-events-none absolute inset-0 z-[1] h-full w-full text-teal-400/55 dark:text-teal-400/45"
        aria-hidden
      >
        <defs>
          <linearGradient id={lineGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={`url(#${lineGradId})`}
            strokeWidth={1.75}
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="relative z-[2] mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {RELATIONAL_PILLARS.map((pillar) => (
          <PillarCard key={pillar.id} pillar={pillar} register={registerPillar} />
        ))}
      </div>

      <div className="relative z-[2] mx-auto mt-14 max-w-xl px-2">
        <div
          ref={hubRef}
          className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-lg ring-1 ring-teal-500/20"
        >
          <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600/25 via-emerald-600/20 to-cyan-600/25 px-4 py-2">
            <Activity className="h-4 w-4 text-teal-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400/95">
              {HUB_COPY.subtitle}
            </span>
          </div>
          <div className="space-y-3 p-5 text-center">
            <h4 className="text-lg font-bold text-brand-text">{HUB_COPY.title}</h4>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-brand-muted">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-dark/40 px-3 py-1">
                <HardDrive className="h-3.5 w-3.5 text-amber-400/90" />
                Redis (filas + DLQ)
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-dark/40 px-3 py-1">
                <Database className="h-3.5 w-3.5 text-violet-400/90" />
                Postgres
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${
                  hubStats?.workerOk ?
                    "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/35 bg-amber-500/10 text-amber-200"
                }`}
              >
                Worker {hubStats?.workerOk ? "ativo" : "verificar"}
              </span>
            </div>
            {hubStats ? (
              <div className="flex justify-center gap-6 border-t border-brand-border/70 pt-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-brand-muted">Fila</p>
                  <p className="font-semibold tabular-nums text-brand-text">{hubStats.backlogTotal}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-brand-muted">DLQ</p>
                  <p className="font-semibold tabular-nums text-red-300/90">{hubStats.dlqTotal}</p>
                </div>
              </div>
            ) : null}
            <ul className="mx-auto max-w-md space-y-1 text-left text-xs text-brand-muted">
              {HUB_COPY.lines.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-teal-500/80">→</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="relative z-[2] mx-auto mt-6 max-w-2xl text-center text-[11px] text-brand-muted">
        Linhas tracejadas indicam o fluxo de dados e enfileiramento até o processamento central; relações reais
        seguem <span className="font-mono text-brand-text/80">FOREIGN KEY</span> e colunas{" "}
        <span className="font-mono text-brand-text/80">tenant_id</span> no schema Drizzle.
      </p>
    </div>
  );
}
