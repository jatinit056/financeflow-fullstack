/** Legend that mirrors the mark: a small rounded rectangle for bars, a line for lines. */
export function ChartLegend({ items, shape = 'rect' }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={shape === 'line' ? 'h-0.5 w-4 rounded-full' : 'size-2.5 rounded-[3px]'}
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
