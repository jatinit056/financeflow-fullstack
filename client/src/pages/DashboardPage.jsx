import { ChartColumnBig, PieChart, ReceiptText } from 'lucide-react';
import { dashboardApi } from '../api/endpoints.js';
import { useAuth } from '../auth/useAuth.js';
import { BudgetRunway } from '../components/budget/BudgetRunway.jsx';
import { CategoryBreakdown } from '../components/charts/CategoryBreakdown.jsx';
import { ChartLegend } from '../components/charts/ChartLegend.jsx';
import { DataTable } from '../components/charts/DataTable.jsx';
import { IncomeExpenseChart } from '../components/charts/IncomeExpenseChart.jsx';
import { SERIES } from '../components/charts/chartTheme.js';
import { TransactionList } from '../components/transactions/TransactionList.jsx';
import { Button, ButtonLink } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { PanelSkeleton, Skeleton } from '../components/ui/Skeleton.jsx';
import { useComposer } from '../composer/useComposer.js';
import { useApi } from '../hooks/useApi.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { currentMonth } from '../lib/dates.js';
import { formatCurrency, formatMonth, monthName } from '../lib/format.js';

function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Balance, all-time income and expenses — read like the summary block of a statement. */
function StatementSummary({ summary, currentMonth: month, period }) {
  return (
    <div>
      <p className="text-sm text-ink-2">Current balance</p>
      <p
        className={`figure mt-1 text-[34px] leading-none font-semibold ${summary.balance < 0 ? 'text-negative' : 'text-ink'}`}
      >
        {formatCurrency(summary.balance)}
      </p>
      <p className="mt-2 text-sm text-ink-3">Income minus expenses, across all transactions.</p>

      <dl className="mt-6 divide-y divide-rule border-t border-rule">
        <div className="flex items-baseline justify-between gap-4 py-3.5">
          <dt className="flex items-center gap-2 text-sm text-ink-2">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: SERIES.income }}
            />
            Total income
          </dt>
          <dd className="text-right">
            <span className="figure block text-lg font-semibold tabular-nums">
              {formatCurrency(summary.totalIncome)}
            </span>
            <span className="block text-xs text-ink-3">
              {formatCurrency(month.income)} in {monthName(period.month)}
            </span>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 py-3.5">
          <dt className="flex items-center gap-2 text-sm text-ink-2">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: SERIES.expenses }}
            />
            Total expenses
          </dt>
          <dd className="text-right">
            <span className="figure block text-lg font-semibold tabular-nums">
              {formatCurrency(summary.totalExpenses)}
            </span>
            <span className="block text-xs text-ink-3">
              {formatCurrency(month.expenses)} in {monthName(period.month)}
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-6 w-72" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-72 rounded-panel xl:col-span-2" />
        <PanelSkeleton />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <PanelSkeleton className="h-80 xl:col-span-2" />
        <PanelSkeleton />
      </div>
      <span className="sr-only">Loading your dashboard…</span>
    </div>
  );
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { dataVersion, openCreate } = useComposer();
  const { year, month } = currentMonth();

  const { data, error, initialLoading, reload } = useApi(
    (signal) => dashboardApi.get({ year, month }, signal),
    [year, month, dataVersion],
  );

  if (initialLoading) return <DashboardSkeleton />;
  if (error && !data) {
    return (
      <Panel>
        <ErrorState error={error} onRetry={reload} title="Couldn't load your dashboard" />
      </Panel>
    );
  }

  const hasTransactions = data.summary.transactionCount > 0;
  const hasTrend = data.monthlyTrend.some((m) => m.income > 0 || m.expenses > 0);
  const budget = { ...data.budget, year, month };

  return (
    <div className="space-y-6">
      <p className="text-ink-2">
        {greeting()}, <span className="font-semibold text-ink">{user.name.split(' ')[0]}</span>.
        Here's how {formatMonth(data.period)} is going.
      </p>

      <div className="grid gap-6 xl:grid-cols-3">
        <section
          aria-labelledby="runway-heading"
          className="rounded-panel bg-brand-800 p-6 sm:p-8 xl:col-span-2"
        >
          <h2 id="runway-heading" className="sr-only">
            Budget for {formatMonth(data.period)}
          </h2>
          <BudgetRunway
            budget={budget}
            tone="dark"
            action={
              budget.status === 'none' ? (
                <ButtonLink to="/budget" variant="inverse">
                  Set a monthly budget
                </ButtonLink>
              ) : null
            }
          />
        </section>

        <Panel>
          <StatementSummary
            summary={data.summary}
            currentMonth={data.currentMonth}
            period={data.period}
          />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Income vs expenses"
          description="Last 6 months"
          actions={
            hasTrend ? (
              <ChartLegend
                items={[
                  { label: 'Income', color: SERIES.income },
                  { label: 'Expenses', color: SERIES.expenses },
                ]}
              />
            ) : null
          }
        >
          {hasTrend ? (
            <>
              <IncomeExpenseChart
                data={data.monthlyTrend}
                tooltipLabel={(_label, point) => formatMonth(point)}
              />
              <DataTable
                visuallyHidden
                caption="Income and expenses for the last 6 months"
                columns={[
                  { key: 'month', label: 'Month', render: (row) => formatMonth(row) },
                  {
                    key: 'income',
                    label: 'Income',
                    align: 'right',
                    render: (row) => formatCurrency(row.income),
                  },
                  {
                    key: 'expenses',
                    label: 'Expenses',
                    align: 'right',
                    render: (row) => formatCurrency(row.expenses),
                  },
                ]}
                rows={data.monthlyTrend.map((row) => ({ ...row, key: row.key }))}
              />
            </>
          ) : (
            <EmptyState
              icon={ChartColumnBig}
              title="Your monthly trend shows up here"
              description="Add income and expenses to compare them month by month."
            />
          )}
        </Panel>

        <Panel title="Where your money went" description={`Expenses in ${monthName(month)}`}>
          {data.expenseBreakdown.length > 0 ? (
            <>
              <CategoryBreakdown items={data.expenseBreakdown} limit={6} />
              {data.expenseBreakdown.length > 6 && (
                <ButtonLink to="/analytics" variant="ghost" size="sm" className="mt-4 -ml-3">
                  See all {data.expenseBreakdown.length} categories
                </ButtonLink>
              )}
            </>
          ) : (
            <EmptyState
              icon={PieChart}
              title="No spending yet this month"
              description="Expenses you add will be grouped by category here."
            />
          )}
        </Panel>
      </div>

      <Panel
        title="Recent transactions"
        actions={
          hasTransactions ? (
            <ButtonLink to="/transactions" variant="secondary" size="sm">
              View all
            </ButtonLink>
          ) : null
        }
      >
        {hasTransactions ? (
          <TransactionList transactions={data.recentTransactions} />
        ) : (
          <EmptyState
            icon={ReceiptText}
            title="No transactions yet"
            description="Start with your salary and rent, then add daily spending as it happens."
            action={<Button onClick={openCreate}>Add your first transaction</Button>}
          />
        )}
      </Panel>
    </div>
  );
}
