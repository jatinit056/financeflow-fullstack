import { CATEGORIES, categoryLabel } from '../../lib/categories.js';
import { formatCurrency } from '../../lib/format.js';

const shareLabel = (percentage) =>
  percentage > 0 && percentage < 1 ? '<1%' : `${Math.round(percentage)}%`;

/**
 * Ranked horizontal bars for spending by category. Plain HTML rather than SVG, so labels
 * wrap and truncate properly and every value is readable without hovering.
 * Bars use the expenses colour, because every bar here is an expense.
 */
export function CategoryBreakdown({ items, limit }) {
  const shown = limit ? items.slice(0, limit) : items;
  const max = Math.max(...items.map((item) => item.total), 1);

  return (
    <ul className="space-y-3.5">
      {shown.map((item) => {
        const Icon = CATEGORIES[item.category]?.icon;
        return (
          <li key={item.category}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-ink">
                {Icon && <Icon aria-hidden="true" className="size-4 shrink-0 text-ink-3" />}
                <span className="truncate">{categoryLabel(item.category)}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="figure font-semibold text-ink">{formatCurrency(item.total)}</span>
                <span className="ml-2 inline-block w-11 text-right text-ink-3">
                  {shareLabel(item.percentage)}
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-r-[4px] bg-paper" aria-hidden="true">
              <div
                className="h-full rounded-r-[4px] bg-expense"
                style={{ width: `${Math.max((item.total / max) * 100, 1.5)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
