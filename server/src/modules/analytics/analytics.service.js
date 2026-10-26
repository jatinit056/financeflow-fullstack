import { expensesByCategory, monthlyTotals, sumByType } from '../../lib/aggregates.js';
import { prisma } from '../../lib/prisma.js';
import {
  lastMonths,
  monthBounds,
  monthKey,
  monthLabel,
  monthName,
  toDbDate,
} from '../../utils/dates.js';
import { percentage, round2 } from '../../utils/money.js';
import { serializeTransaction } from '../transactions/transactions.service.js';

/**
 * Month-by-month income, expenses, net savings and running balance, plus category totals and
 * a few headline insights for the selected period.
 */
export async function getAnalytics(userId, { anchor, months }) {
  const series = lastMonths(anchor, months);
  const range = { start: monthBounds(series[0]).start, end: monthBounds(anchor).end };

  const [totalsByMonth, categoryExpenses, beforeRange, inRange, largest] = await Promise.all([
    monthlyTotals(userId, range),
    expensesByCategory(userId, range),
    // Everything before the period = the opening balance the trend line starts from.
    sumByType(userId, { end: range.start }),
    sumByType(userId, range),
    prisma.transaction.findFirst({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: toDbDate(range.start), lt: toDbDate(range.end) },
      },
      orderBy: [{ amount: 'desc' }, { date: 'desc' }],
    }),
  ]);

  let balance = beforeRange.net;
  const monthly = series.map(({ year, month }) => {
    const totals = totalsByMonth.get(monthKey(year, month)) ?? { income: 0, expenses: 0 };
    const net = round2(totals.income - totals.expenses);
    balance = round2(balance + net);
    return {
      key: monthKey(year, month),
      label: `${monthName(month).slice(0, 3)} ${String(year).slice(2)}`,
      year,
      month,
      income: totals.income,
      expenses: totals.expenses,
      net,
      balance,
      savingsRate: percentage(net, totals.income),
    };
  });

  const activeMonths = monthly.filter((m) => m.income > 0 || m.expenses > 0);
  const bestMonth = activeMonths.reduce((best, m) => (!best || m.net > best.net ? m : best), null);
  const topSpendingMonth = activeMonths.reduce(
    (top, m) => (!top || m.expenses > top.expenses ? m : top),
    null,
  );

  return {
    range: {
      months,
      start: range.start,
      end: range.end,
      label: `${monthLabel(series[0])} – ${monthLabel(anchor)}`,
    },
    totals: {
      income: inRange.income,
      expenses: inRange.expenses,
      net: inRange.net,
      savingsRate: percentage(inRange.net, inRange.income),
      openingBalance: beforeRange.net,
      closingBalance: balance,
      transactionCount: inRange.count,
    },
    averages: {
      monthlyIncome: round2(inRange.income / months),
      monthlyExpenses: round2(inRange.expenses / months),
    },
    monthly,
    categoryExpenses,
    insights: {
      topCategory: categoryExpenses[0] ?? null,
      largestExpense: largest ? serializeTransaction(largest) : null,
      bestMonth: bestMonth
        ? { key: bestMonth.key, label: monthLabel(bestMonth), net: bestMonth.net }
        : null,
      topSpendingMonth: topSpendingMonth
        ? {
            key: topSpendingMonth.key,
            label: monthLabel(topSpendingMonth),
            expenses: topSpendingMonth.expenses,
          }
        : null,
    },
  };
}
