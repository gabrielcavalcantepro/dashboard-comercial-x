"use client";

interface Payload {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Payload[];
  formatter?: (payload: Payload) => string;
}

export function ChartTooltip({ active, label, payload, formatter }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-[10px] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3.5 py-2.5 text-[12.5px] shadow-[0_25px_50px_-20px_rgba(0,0,0,0.85)]">
      {label && <div className="mb-1.5 text-[var(--color-text-faint)]">{label}</div>}
      <div className="flex flex-col gap-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[var(--color-text)]">
            <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: p.color }} />
            <span>{formatter ? formatter(p) : `${p.name}: ${p.value}`}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
