import { ChevronLeft, ChevronRight, PieChart } from 'lucide-react';
import { useState } from 'react';
import { budgetApi } from '../api/endpoints.js';
import { BudgetForm } from '../components/budget/BudgetForm.jsx';
import { BudgetRunway } from '../components/budget/BudgetRunway.jsx';
import { CategoryBreakdown } from '../components/charts/CategoryBreakdown.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { PanelSkeleton } from '../components/ui/Skeleton.jsx';
import { StatusBadge } from '../components/ui/StatusBadge.jsx';
import { useComposer } from '../composer/useComposer.js';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { compareMonths, currentMonth, shiftMonth } from '../lib/dates.js';
import { formatCurrency, formatMonth } from '../lib/format.js';

const METER_FILL = { on_track: 'bg-brand-600', warning: 'bg-warning', exceeded: 'bg-critical' };

function MonthSwitcher({ period, onChange, max }) {
  const atMax = compareMonths(period, max) >= 0;
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-rule bg-surface p-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(shiftMonth(period, -1))}
        aria-label="Previous month"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Button>
      <p className="min-w-36 text-center font-semibold" aria-live="polite">
        {formatMonth(period)}
      </p>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(shiftMonth(period, 1))}
        disabled={atMax}
        aria-label="Next month"
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </Button>
    </div>
  );
}

function BudgetHistory({ history }) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Budget history table">
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">Budget and spending for the last six months</caption>
        <thead>
          <tr className="border-b border-rule text-[13px] text-ink-3">
            <th scope="col" className="py-2.5 pr-4 font-medium">
              Month
            </th>
            <th scope="col" className="py-2.5 pr-4 text-right font-medium">
              Budget
            </th>
            <th scope="col" className="py-2.5 pr-4 text-right font-medium">
              Spent
            </th>
            <th scope="col" className="w-[28%] py-2.5 pr-4 font-medium">
              Used
            </th>
            <th scope="col" className="py-2.5 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {[...history].reverse().map((row) => (
            <tr key={`${row.year}-${row.month}`}>
              <th scope="row" className="py-3 pr-4 font-medium text-ink">
                {formatMonth(row)}
              </th>
              <td className="figure py-3 pr-4 text-right text-ink-2 tabular-nums">
                {row.budget === null ? '—' : formatCurrency(row.budget)}
              </td>
              <td className="figure py-3 pr-4 text-right font-semibold text-ink tabular-nums">
                {formatCurrency(row.spent)}
              </td>
              <td className="py-3 pr-4">
                {row.percentUsed === null ? (
                  <span className="text-ink-3">—</span>
                ) : (
                  <div className="flex items-center gap-3">
                    <div
                      className="h-2 flex-1 overflow-hidden rounded-full bg-brand-50"
                      aria-hidden="true"
                    >
                      <div
                        className={`h-full rounded-full ${METER_FILL[row.status]}`}
                        style={{ width: `${Math.min(row.percentUsed, 100)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-ink-2 tabular-nums">
                      {Math.round(row.percentUsed)}%
                    </span>
                  </div>
                )}
              </td>
              <td className="py-3">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BudgetPage() {
  useDocumentTitle('Budget');
  const { dataVersion } = useComposer();
  const thisMonth = currentMonth();
  const [period, setPeriod] = useState(thisMonth);
  const [editing, setEditing] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  const { data, error, initialLoading, loading, reload } = useApi(
    (signal) => budgetApi.get(period, signal),
    [period.year, period.month, dataVersion, savedCount],
  );

  const changePeriod = (next) => {
    setPeriod(next);
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-ink-2">
          Set a spending limit for each month. You'll get a warning at 80% and when you go over.
        </p>
        <MonthSwitcher period={period} onChange={changePeriod} max={shiftMonth(thisMonth, 1)} />
      </div>

      {initialLoading && (
        <div className="grid gap-6 xl:grid-cols-5">
          <PanelSkeleton className="h-80 xl:col-span-3" />
          <PanelSkeleton className="xl:col-span-2" />
        </div>
      )}

      {error && !data && (
        <Panel>
          <ErrorState error={error} onRetry={reload} title="Couldn't load your budget" />
        </Panel>
      )}

      {data && (
        <div
          className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}
          aria-busy={loading || undefined}
        >
          <div className="grid gap-6 xl:grid-cols-5">
            <Panel className="xl:col-span-3" title="Monthly budget">
              <BudgetRunway budget={data} tone="light" />
              <div className="mt-7 border-t border-rule pt-6">
                {data.budget && !editing ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-ink-2">
                      Budget for {formatMonth(data)}:{' '}
                      <span className="figure font-semibold text-ink">
                        {formatCurrency(data.budget.amount)}
                      </span>
                    </p>
                    <Button variant="secondary" onClick={() => setEditing(true)}>
                      Change budget
                    </Button>
                  </div>
                ) : (
                  <BudgetForm
                    key={`${data.year}-${data.month}`}
                    period={{ year: data.year, month: data.month }}
                    existing={data.budget}
                    onSaved={() => {
                      setEditing(false);
                      setSavedCount((count) => count + 1);
                    }}
                    onCancel={data.budget ? () => setEditing(false) : undefined}
                  />
                )}
              </div>
            </Panel>

            <Panel
              className="xl:col-span-2"
              title="Spending by category"
              description={formatMonth(data)}
            >
              {data.categoryBreakdown.length > 0 ? (
                <CategoryBreakdown items={data.categoryBreakdown} />
              ) : (
                <EmptyState
                  icon={PieChart}
                  title="No spending in this month"
                  description="Expenses you add for this month will appear here."
                />
              )}
            </Panel>
          </div>

          <Panel
            title="Budget history"
            description="How the last six months went against their budgets"
          >
            <BudgetHistory history={data.history} />
          </Panel>
        </div>
      )}
    </div>
  );
}
