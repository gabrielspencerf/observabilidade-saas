interface ObservabilityServiceMiniTrendProps {
  values: number[];
  labels: string[];
  tone?: "emerald" | "amber" | "red";
}

function toneClass(tone: NonNullable<ObservabilityServiceMiniTrendProps["tone"]>) {
  if (tone === "amber") return "bg-amber-500/80";
  if (tone === "red") return "bg-red-500/80";
  return "bg-emerald-500/80";
}

export function ObservabilityServiceMiniTrend({
  values,
  labels,
  tone = "emerald",
}: ObservabilityServiceMiniTrendProps) {
  const bars = values.slice(-6);
  const labelsSlice = labels.slice(-bars.length);
  const barColor = toneClass(tone);

  return (
    <div className="mt-3 rounded-md border border-brand-border/70 bg-brand-surface/40 p-2">
      <div className="flex h-10 items-end gap-1">
        {bars.map((value, idx) => {
          const height = Math.max(12, Math.round((value / 100) * 100));
          const label = labelsSlice[idx] ?? "—";
          return (
            <div key={`${label}-${idx}`} className="flex-1">
              <div
                className={`w-full rounded-sm ${barColor}`}
                style={{ height: `${height}%` }}
                title={`${label}: ${value}%`}
                aria-label={`${label} ${value}%`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-brand-muted">
        <span>{labelsSlice[0] ?? "—"}</span>
        <span>agora</span>
      </div>
    </div>
  );
}
