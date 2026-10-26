import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { formatCompactCurrency } from '../../lib/format.js';
import { ChartTooltip } from './ChartTooltip.jsx';
import { axisTick, CHROME, SERIES } from './chartTheme.js';

/** Running balance at the end of each month: a 2px line over a 10% wash, crosshair tooltip. */
export function BalanceTrendChart({ data, height = 280, tooltipLabel }) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <AreaChart
      data={data}
      responsive
      style={{ width: '100%', height }}
      margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
      accessibilityLayer
    >
      <CartesianGrid vertical={false} stroke={CHROME.grid} />
      <XAxis
        dataKey="label"
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
        tickCount={6}
      />
      <Tooltip
        cursor={{ stroke: CHROME.crosshair, strokeWidth: 1 }}
        content={<ChartTooltip labelFormatter={tooltipLabel} />}
      />
      <Area
        type="monotone"
        dataKey="balance"
        name="Balance"
        stroke={SERIES.balance}
        strokeWidth={2}
        fill={SERIES.balance}
        fillOpacity={0.1}
        dot={{ r: 4, fill: SERIES.balance, stroke: CHROME.surface, strokeWidth: 2 }}
        activeDot={{ r: 6, fill: SERIES.balance, stroke: CHROME.surface, strokeWidth: 2 }}
        isAnimationActive={!reducedMotion}
      />
    </AreaChart>
  );
}
