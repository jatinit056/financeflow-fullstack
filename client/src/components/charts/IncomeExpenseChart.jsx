import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { formatCompactCurrency, formatCurrency } from '../../lib/format.js';
import { ChartTooltip } from './ChartTooltip.jsx';
import { axisTick, CHROME, SERIES } from './chartTheme.js';

/**
 * Grouped columns: income vs expenses per month.
 * Thin bars (max 24px) with a 2px gap, 4px rounded tops, hairline grid.
 */
export function IncomeExpenseChart({ data, height = 280, labelKey = 'label', tooltipLabel }) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <BarChart
      data={data}
      responsive
      style={{ width: '100%', height }}
      margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
      barGap={2}
      barCategoryGap="30%"
      accessibilityLayer
    >
      <CartesianGrid vertical={false} stroke={CHROME.grid} />
      <XAxis
        dataKey={labelKey}
        tickLine={false}
        axisLine={{ stroke: CHROME.axis }}
        tick={axisTick}
        tickMargin={8}
        interval="preserveStartEnd"
      />
      <YAxis
        tickFormatter={formatCompactCurrency}
        tickLine={false}
        axisLine={false}
        tick={axisTick}
        width={56}
        tickCount={5}
      />
      <Tooltip
        cursor={{ fill: CHROME.cursor }}
        content={
          <ChartTooltip
            labelFormatter={tooltipLabel}
            extraRows={(point) => (
              <li className="mt-1.5 border-t border-rule pt-1.5 text-ink-2">
                Net{' '}
                <span
                  className={`figure font-semibold tabular-nums ${point.income - point.expenses < 0 ? 'text-negative' : 'text-positive'}`}
                >
                  {formatCurrency(point.income - point.expenses)}
                </span>
              </li>
            )}
          />
        }
      />
      <Bar
        dataKey="income"
        name="Income"
        fill={SERIES.income}
        maxBarSize={24}
        radius={[4, 4, 0, 0]}
        isAnimationActive={!reducedMotion}
      />
      <Bar
        dataKey="expenses"
        name="Expenses"
        fill={SERIES.expenses}
        maxBarSize={24}
        radius={[4, 4, 0, 0]}
        isAnimationActive={!reducedMotion}
      />
    </BarChart>
  );
}
