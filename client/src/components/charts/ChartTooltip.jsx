import { formatCurrency } from '../../lib/format.js';

/** Tooltip: the value leads, the series name follows; series are keyed with a short line. */
export function ChartTooltip({ active, payload, label, labelFormatter, extraRows }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="min-w-40 rounded-lg border border-rule bg-surface px-3 py-2.5 text-sm shadow-lg shadow-brand-900/10">
      <p className="mb-1.5 text-xs font-medium text-ink-3">
        {labelFormatter ? labelFormatter(label, point) : label}
      </p>
      <ul className="space-y-1">
        {payload.map((item) => (
          <li key={item.dataKey} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="figure font-semibold text-ink tabular-nums">
              {formatCurrency(item.value)}
            </span>
            <span className="text-ink-2">{item.name}</span>
          </li>
        ))}
        {extraRows?.(point)}
      </ul>
    </div>
  );
}
