// Small bar charts from the design canvas. Bars grow in once (tp-bar); each bar's value is in its tooltip.

// KPI card: thin rounded bars, the last one (today) in blue
export function MiniBars({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  return (
    <div role="img" aria-label={label} className="flex h-[52px] shrink-0 items-end gap-[5px]">
      {values.map((v, i) => (
        <span
          key={i}
          title={String(v)}
          className={`tp-bar w-[9px] rounded-full ${i === values.length - 1 ? 'bg-primary' : 'bg-bar-soft'}`}
          style={{ height: `${Math.max(6, Math.round((v / max) * 52))}px`, animationDelay: `${i * 40}ms` }}
        />
      ))}
    </div>
  );
}

// Week chart: one column per day, stacked series (first part on top)
export interface WeekBar {
  day: string;
  parts: { value: number; className: string; label: string }[];
  highlight?: boolean;
}
export function WeekChart({ bars, height = 170, format = String, label }: { bars: WeekBar[]; height?: number; format?: (n: number) => string; label: string }) {
  const max = Math.max(1, ...bars.map((b) => b.parts.reduce((n, p) => n + p.value, 0)));
  return (
    <div role="img" aria-label={label} className="flex items-end gap-3.5" style={{ height }}>
      {bars.map((b, i) => (
        <div key={b.day + i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <div className="flex w-full max-w-[30px] flex-col gap-[3px]">
            {b.parts.map((p) =>
              p.value > 0 ? (
                <div
                  key={p.label}
                  title={`${b.day} · ${p.label}: ${format(p.value)}`}
                  className={`tp-bar rounded-lg ${p.className}`}
                  style={{ height: Math.max(6, Math.round((p.value / max) * (height - 28))), animationDelay: `${i * 50}ms` }}
                />
              ) : null,
            )}
            {b.parts.every((p) => p.value === 0) && <div className="h-1.5 rounded-lg bg-chip" title={`${b.day}: nothing`} />}
          </div>
          <span className={`text-xs font-semibold ${b.highlight ? 'text-ink' : 'text-muted'}`}>{b.day}</span>
        </div>
      ))}
    </div>
  );
}
