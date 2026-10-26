import { compareMonths, currentMonth, daysInMonth, isSameMonth } from '../../lib/dates.js';
import { formatCurrency, formatMonth, monthName } from '../../lib/format.js';
import { StatusBadge } from '../ui/StatusBadge.jsx';

const FILL = {
  dark: { on_track: 'bg-brand-200', warning: 'bg-warning', exceeded: 'bg-[#ff8a80]' },
  light: { on_track: 'bg-brand-600', warning: 'bg-warning', exceeded: 'bg-critical' },
};

/** Where "today" sits in the month, so spending can be compared with time passed. */
function monthProgress(period, now = new Date()) {
  const today = currentMonth(now);
  const totalDays = daysInMonth(period);
  if (isSameMonth(period, today)) {
    const day = now.getDate();
    return { isCurrent: true, percent: (day / totalDays) * 100, daysLeft: totalDays - day + 1 };
  }
  return { isCurrent: false, percent: compareMonths(period, today) < 0 ? 100 : 0, daysLeft: 0 };
}

function headline(budget, progress) {
  if (budget.status === 'none') {
    return { figure: budget.spent, caption: `spent so far in ${monthName(budget.month)}` };
  }
  if (budget.status === 'exceeded') {
    return { figure: Math.abs(budget.remaining), caption: 'over budget' };
  }
  return {
    figure: budget.remaining,
    caption: progress.isCurrent ? 'left to spend' : 'left unspent',
  };
}

function message(budget, progress) {
  if (budget.status === 'none') return 'Set a monthly budget to see how much you can still spend.';
  if (budget.status === 'exceeded') {
    return `You've spent ${formatCurrency(budget.spent)} of your ${formatCurrency(budget.amount)} budget.`;
  }
  if (progress.isCurrent && progress.daysLeft > 0) {
    const perDay = budget.remaining / progress.daysLeft;
    const days = progress.daysLeft === 1 ? 'today' : `a day for the next ${progress.daysLeft} days`;
    return `About ${formatCurrency(Math.floor(perDay))} ${days} keeps you within budget.`;
  }
  return `You spent ${formatCurrency(budget.spent)} of your ${formatCurrency(budget.amount)} budget.`;
}

/**
 * The month's "runway": how much is left, a meter of budget used, and a marker for today,
 * so it's obvious whether spending is running ahead of the calendar.
 */
export function BudgetRunway({ budget, tone = 'dark', action }) {
  const progress = monthProgress({ year: budget.year, month: budget.month });
  const { figure, caption } = headline(budget, progress);
  const dark = tone === 'dark';
  const used = budget.percentUsed ?? 0;
  const ahead = progress.isCurrent && budget.status !== 'none' && used > progress.percent + 2;

  return (
    <div className={dark ? 'text-white' : 'text-ink'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={`text-sm font-medium ${dark ? 'text-brand-100' : 'text-ink-2'}`}>
          {formatMonth(budget)}
        </p>
        <StatusBadge status={budget.status} className={dark ? 'bg-white! text-ink!' : ''} />
      </div>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="figure text-[44px] leading-none font-semibold sm:text-[52px]">
          {formatCurrency(figure)}
        </span>
        <span className={`text-lg ${dark ? 'text-brand-100' : 'text-ink-2'}`}>{caption}</span>
      </p>
      <p className={`mt-2 max-w-xl text-[15px] ${dark ? 'text-brand-50/90' : 'text-ink-2'}`}>
        {message(budget, progress)}
      </p>

      {budget.status !== 'none' && (
        <div className="mt-7">
          <div
            role="meter"
            aria-label="Budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(used, 100)}
            aria-valuetext={`${Math.round(used)}% of the budget used`}
            className={`relative h-3 rounded-full ${dark ? 'bg-white/15' : 'bg-brand-50'}`}
          >
            <div
              className={`h-full rounded-full ${FILL[tone][budget.status] ?? FILL[tone].on_track}`}
              style={{ width: `${Math.min(used, 100)}%` }}
            />
            {progress.isCurrent && (
              <div
                className="absolute -top-1.5 -bottom-1.5 w-0.5 -translate-x-1/2 rounded-full bg-current"
                style={{ left: `${progress.percent}%` }}
                aria-hidden="true"
              />
            )}
          </div>
          <div
            className={`relative mt-2 h-5 text-[13px] ${dark ? 'text-brand-100' : 'text-ink-3'}`}
          >
            {progress.isCurrent && (
              <span
                className="absolute -translate-x-1/2 whitespace-nowrap"
                style={{ left: `clamp(1.5rem, ${progress.percent}%, calc(100% - 1.5rem))` }}
              >
                Today
              </span>
            )}
          </div>
          <div
            className={`mt-1 flex flex-wrap justify-between gap-2 text-sm ${dark ? 'text-brand-50/90' : 'text-ink-2'}`}
          >
            <span>
              Spent{' '}
              <span className="figure font-semibold text-current tabular-nums">
                {formatCurrency(budget.spent)}
              </span>{' '}
              ({Math.round(used)}%)
            </span>
            <span>
              Budget{' '}
              <span className="figure font-semibold tabular-nums">
                {formatCurrency(budget.amount)}
              </span>
            </span>
          </div>
          {ahead && (
            <p className={`mt-3 text-sm ${dark ? 'text-brand-50/90' : 'text-ink-2'}`}>
              You've used {Math.round(used)}% of the budget with{' '}
              {Math.round(100 - progress.percent)}% of the month still to go.
            </p>
          )}
        </div>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
