import { CalendarCheck, ChartColumnBig, Crown, Flame, Receipt } from 'lucide-react';
import { useState } from 'react';
import { analyticsApi } from '../api/endpoints.js';
import { BalanceTrendChart } from '../components/charts/BalanceTrendChart.jsx';
import { CategoryBreakdown } from '../components/charts/CategoryBreakdown.jsx';
import { ChartLegend } from '../components/charts/ChartLegend.jsx';
import { DataTable } from '../components/charts/DataTable.jsx';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart.jsx';
import { SERIES } from '../components/charts/chartTheme.js';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { PanelSkeleton, Skeleton } from '../components/ui/Skeleton.jsx';
import { useComposer } from '../composer/useComposer.js';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { categoryLabel } from '../lib/categories.js';
import { currentMonth } from '../lib/dates.js';
import { formatCurrency, formatDate, formatMonth, formatPercent } from '../lib/format.js';

const PERIODS = [
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
];

const VIEW_OPTIONS = [
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
];

function ViewToggle({ value, onChange, label }) {
  return (
    <SegmentedControl
      label={`${label} view`}
      options={VIEW_OPTIONS}
      value={value}
      onChange={onChange}
      size="sm"
    />
  );
}

function KeyFigures({ totals, averages }) {
  const items = [
    {
      label: 'Income',
      value: formatCurrency(totals.income),
      note: `${formatCurrency(Math.round(averages.monthlyIncome))} a month on average`,
    },
    {
      label: 'Expenses',
      value: formatCurrency(totals.expenses),
      note: `${formatCurrency(Math.round(averages.monthlyExpenses))} a month on average`,
    },
    {
      label: 'Net saved',
      value: formatCurrency(totals.net),
      note: totals.net >= 0 ? 'Income left after expenses' : 'Spent more than you earned',
      negative: totals.net < 0,
    },
    {
      label: 'Savings rate',
      value: formatPercent(totals.savingsRate, { decimals: 1 }),
      note: 'Share of income you kept',
    },
  ];

  return (
    <dl className="grid overflow-hidden rounded-panel border border-rule bg-surface sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="border-rule p-5 not-last:border-b sm:p-6 sm:nth-[odd]:border-r xl:border-b-0 xl:not-last:border-r"
        >
          <dt className="text-sm text-ink-2">{item.label}</dt>
          <dd
            className={`figure mt-1.5 text-[28px] leading-tight font-semibold ${item.negative ? 'text-negative' : 'text-ink'}`}
          >
            {item.value}
          </dd>
          <dd className="mt-1 text-sm text-ink-3">{item.note}</dd>
        </div>
      ))}
    </dl>
  );
}

function Highlights({ insights }) {
  const rows = [
    insights.topCategory && {
      icon: Crown,
      label: 'Biggest spending category',
      value: categoryLabel(insights.topCategory.category),
      detail: `${formatCurrency(insights.topCategory.total)}, ${Math.round(insights.topCategory.percentage)}% of spending`,
    },
    insights.largestExpense && {
      icon: Receipt,
      label: 'Largest single expense',
      value: insights.largestExpense.description || categoryLabel(insights.largestExpense.category),
      detail: `${formatCurrency(insights.largestExpense.amount)} on ${formatDate(insights.largestExpense.date)}`,
    },
    insights.bestMonth && {
      icon: CalendarCheck,
      label: 'Best month for saving',
      value: insights.bestMonth.label,
      detail: `${formatCurrency(insights.bestMonth.net)} saved`,
    },
    insights.topSpendingMonth && {
      icon: Flame,
      label: 'Highest spending month',
      value: insights.topSpendingMonth.label,
      detail: `${formatCurrency(insights.topSpendingMonth.expenses)} spent`,
    },
  ].filter(Boolean);

  return (
    <ul className="divide-y divide-rule">
      {rows.map(({ icon: Icon, label, value, detail }) => (
        <li key={label} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-paper text-ink-2"
            aria-hidden="true"
          >
            <Icon className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-ink-2">{label}</p>
            <p className="truncate font-semibold text-ink">{value}</p>
            <p className="text-sm text-ink-3">{detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AnalyticsPage() {
  useDocumentTitle('Analytics');
  const { dataVersion } = useComposer();
  const { year, month } = currentMonth();
  const [months, setMonths] = useState(6);
  const [flowView, setFlowView] = useState('chart');
  const [balanceView, setBalanceView] = useState('chart');

  const { data, error, loading, initialLoading, reload } = useApi(
    (signal) => analyticsApi.get({ months, year, month }, signal),
    [months, year, month, dataVersion],
  );

  const monthlyColumns = [
    { key: 'month', label: 'Month', render: (row) => formatMonth(row) },
    { key: 'income', label: 'Income', align: 'right', render: (row) => formatCurrency(row.income) },
    {
      key: 'expenses',
      label: 'Expenses',
      align: 'right',
      render: (row) => formatCurrency(row.expenses),
    },
    { key: 'net', label: 'Net', align: 'right', render: (row) => formatCurrency(row.net) },
  ];

  const hasData = data && data.totals.transactionCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-2">{data ? data.range.label : 'Your money over time'}</p>
        <SegmentedControl label="Period" options={PERIODS} value={months} onChange={setMonths} />
      </div>

      {initialLoading && (
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-32 rounded-panel" />
          <PanelSkeleton className="h-80" />
        </div>
      )}

      {error && !data && (
        <Panel>
          <ErrorState error={error} onRetry={reload} title="Couldn't load analytics" />
        </Panel>
      )}

      {data && !hasData && (
        <Panel>
          <EmptyState
            icon={ChartColumnBig}
            title="Nothing to analyse yet"
            description="Once you add transactions, this page shows your monthly income, spending, balance trend and top categories."
          />
        </Panel>
      )}

      {hasData && (
        <div
          className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}
          aria-busy={loading || undefined}
        >
          <KeyFigures totals={data.totals} averages={data.averages} />

          <Panel
            title="Monthly income and expenses"
            description="Totals for each calendar month"
            actions={
              <>
                {flowView === 'chart' && (
                  <ChartLegend
                    items={[
                      { label: 'Income', color: SERIES.income },
                      { label: 'Expenses', color: SERIES.expenses },
                    ]}
                  />
                )}
                <ViewToggle value={flowView} onChange={setFlowView} label="Income and expenses" />
              </>
            }
          >
            {flowView === 'chart' ? (
              <IncomeExpenseChart
                data={data.monthly}
                height={300}
                tooltipLabel={(_label, point) => formatMonth(point)}
              />
            ) : (
              <DataTable
                caption="Monthly income, expenses and net"
                columns={monthlyColumns}
                rows={data.monthly}
              />
            )}
          </Panel>

          <div className="grid gap-6 xl:grid-cols-5">
            <Panel
              className="xl:col-span-3"
              title="Balance over time"
              description="Running balance at the end of each month"
              actions={<ViewToggle value={balanceView} onChange={setBalanceView} label="Balance" />}
            >
              {balanceView === 'chart' ? (
                <>
                  <BalanceTrendChart
                    data={data.monthly}
                    tooltipLabel={(_label, point) => formatMonth(point)}
                  />
                  <p className="mt-3 text-sm text-ink-2">
                    Ended {formatMonth(data.monthly.at(-1))} at{' '}
                    <span className="figure font-semibold text-ink">
                      {formatCurrency(data.totals.closingBalance)}
                    </span>
                    {data.totals.openingBalance !== 0 && (
                      <>
                        , up from{' '}
                        <span className="figure font-semibold text-ink">
                          {formatCurrency(data.totals.openingBalance)}
                        </span>{' '}
                        before this period
                      </>
                    )}
                    .
                  </p>
                </>
              ) : (
                <DataTable
                  caption="Balance at the end of each month"
                  columns={[
                    { key: 'month', label: 'Month', render: (row) => formatMonth(row) },
                    {
                      key: 'net',
                      label: 'Net for the month',
                      align: 'right',
                      render: (row) => formatCurrency(row.net),
                    },
                    {
                      key: 'balance',
                      label: 'Balance',
                      align: 'right',
                      render: (row) => formatCurrency(row.balance),
                    },
                  ]}
                  rows={data.monthly}
                />
              )}
            </Panel>

            <Panel className="xl:col-span-2" title="Highlights">
              <Highlights insights={data.insights} />
            </Panel>
          </div>

          <Panel title="Spending by category" description={`All expenses, ${data.range.label}`}>
            {data.categoryExpenses.length > 0 ? (
              <div className="grid gap-x-12 gap-y-6 lg:grid-cols-2">
                <CategoryBreakdown items={data.categoryExpenses} />
                <DataTable
                  caption="Spending by category"
                  columns={[
                    {
                      key: 'category',
                      label: 'Category',
                      render: (row) => categoryLabel(row.category),
                    },
                    { key: 'count', label: 'Transactions', align: 'right' },
                    {
                      key: 'total',
                      label: 'Total',
                      align: 'right',
                      render: (row) => formatCurrency(row.total),
                    },
                    {
                      key: 'percentage',
                      label: 'Share',
                      align: 'right',
                      render: (row) => formatPercent(row.percentage, { decimals: 1 }),
                    },
                  ]}
                  rows={data.categoryExpenses.map((row) => ({ ...row, key: row.category }))}
                />
              </div>
            ) : (
              <EmptyState icon={ChartColumnBig} title="No expenses in this period" />
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
