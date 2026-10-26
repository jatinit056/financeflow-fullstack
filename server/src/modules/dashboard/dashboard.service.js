import { expensesByCategory, monthlyTotals, sumByType } from '../../lib/aggregates.js';
import { prisma } from '../../lib/prisma.js';
import { lastMonths, monthBounds, monthKey, monthLabel, monthName } from '../../utils/dates.js';
import { round2 } from '../../utils/money.js';
import { getBudgetSnapshot } from '../budget/budget.service.js';
import { serializeTransaction } from '../transactions/transactions.service.js';

const TREND_MONTHS = 6;
const RECENT_COUNT = 6;

/**
 * Everything the dashboard shows, in one round trip. The independent queries run in
 * parallel (Promise.all), so the response time is roughly that of the slowest query.
 */
export async function getDashboard(userId, anchor) {
  const months = lastMonths(anchor, TREND_MONTHS);
  const thisMonth = monthBounds(anchor);
  const trendRange = { start: monthBounds(months[0]).start, end: thisMonth.end };

  const [allTime, monthTotals, budget, expenseBreakdown, totalsByMonth, recent] = await Promise.all(
    [
      sumByType(userId),
      sumByType(userId, thisMonth),
      getBudgetSnapshot(userId, anchor),
      expensesByCategory(userId, thisMonth),
      monthlyTotals(userId, trendRange),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: RECENT_COUNT,
      }),
    ],
  );

  return {
    period: { ...anchor, label: monthLabel(anchor) },
    summary: {
      totalIncome: allTime.income,
      totalExpenses: allTime.expenses,
      balance: allTime.net,
      transactionCount: allTime.count,
    },
    currentMonth: {
      income: monthTotals.income,
      expenses: monthTotals.expenses,
      net: monthTotals.net,
      transactionCount: monthTotals.count,
    },
    budget: {
      amount: budget.amount,
      spent: budget.spent,
      remaining: budget.remaining,
      percentUsed: budget.percentUsed,
      status: budget.status,
    },
    expenseBreakdown,
    monthlyTrend: months.map(({ year, month }) => {
      const totals = totalsByMonth.get(monthKey(year, month)) ?? { income: 0, expenses: 0 };
      return {
        key: monthKey(year, month),
        label: monthName(month).slice(0, 3),
        year,
        month,
        income: totals.income,
        expenses: totals.expenses,
        net: round2(totals.income - totals.expenses),
      };
    }),
    recentTransactions: recent.map(serializeTransaction),
  };
}
